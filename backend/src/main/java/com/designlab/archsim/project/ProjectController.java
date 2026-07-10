package com.designlab.archsim.project;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {
  private final ProjectRepository projects;
  private final CanvasStateRepository canvasStates;
  private final ObjectMapper objectMapper;

  public ProjectController(ProjectRepository projects, CanvasStateRepository canvasStates, ObjectMapper objectMapper) {
    this.projects = projects;
    this.canvasStates = canvasStates;
    this.objectMapper = objectMapper;
  }

  @GetMapping
  public List<ProjectResponse> list(Principal principal) {
    return projects.findByOwnerIdOrderByUpdatedAtDesc(principal.getName()).stream().map(ProjectResponse::from).toList();
  }

  /**
   * Full pull for the local-first workspace: every project the user owns, WITH
   * its canvas, so the frontend can merge server state into localStorage in one
   * round trip (last-write-wins on updatedAt).
   */
  @GetMapping("/sync")
  public List<FullProject> sync(Principal principal) {
    return projects.findByOwnerIdOrderByUpdatedAtDesc(principal.getName()).stream()
        .map(project -> {
          CanvasState state = canvasStates.findById(project.id).orElse(null);
          JsonNode nodes = state != null ? state.nodes : objectMapper.createArrayNode();
          JsonNode links = state != null ? state.links : objectMapper.createArrayNode();
          return new FullProject(
              project.id, project.name, project.description, project.problemSlug,
              project.updatedAt.toEpochMilli(), nodes, links);
        })
        .toList();
  }

  /**
   * Upsert a project by the client's own id (idempotent). The frontend owns the
   * id namespace (e.g. `proj-xxxx`, `practice-<slug>`), so we create-or-update in
   * place rather than minting a server id — keeps local and cloud in lockstep.
   */
  @PutMapping("/{projectId}")
  @Transactional
  public FullProject upsert(
      @PathVariable String projectId,
      @RequestBody UpsertProjectRequest request,
      Principal principal
  ) {
    Project project = projects.findById(projectId).orElse(null);
    if (project == null) {
      project = new Project();
      project.id = projectId;
      project.ownerId = principal.getName();
      project.tenantId = principal.getName();
      project.createdAt = Instant.now();
    } else if (!project.ownerId.equals(principal.getName())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project belongs to another user");
    }
    project.name = request.name() == null ? "Untitled design" : request.name();
    project.description = request.description();
    project.problemSlug = request.problemSlug();
    project.updatedAt = request.updatedAt() != null ? Instant.ofEpochMilli(request.updatedAt()) : Instant.now();
    project.version += 1;
    projects.save(project);

    CanvasState state = canvasStates.findById(projectId).orElseGet(() -> {
      CanvasState created = new CanvasState();
      created.projectId = projectId;
      created.metadata = objectMapper.createObjectNode();
      return created;
    });
    state.nodes = request.nodes() == null ? objectMapper.createArrayNode() : request.nodes();
    state.links = request.links() == null ? objectMapper.createArrayNode() : request.links();
    if (state.metadata == null) state.metadata = objectMapper.createObjectNode();
    state.updatedAt = project.updatedAt;
    canvasStates.save(state);

    return new FullProject(
        project.id, project.name, project.description, project.problemSlug,
        project.updatedAt.toEpochMilli(), state.nodes, state.links);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public ProjectResponse create(@RequestBody CreateProjectRequest request, Principal principal) {
    Project project = new Project();
    project.id = "proj-" + UUID.randomUUID();
    project.name = request.name();
    project.description = request.description();
    project.ownerId = principal.getName();
    project.tenantId = principal.getName();
    projects.save(project);

    CanvasState state = new CanvasState();
    state.projectId = project.id;
    state.nodes = objectMapper.createArrayNode();
    state.links = objectMapper.createArrayNode();
    state.metadata = objectMapper.createObjectNode();
    canvasStates.save(state);
    return ProjectResponse.from(project);
  }

  @GetMapping("/{projectId}")
  public ProjectResponse get(@PathVariable String projectId, Principal principal) {
    return ProjectResponse.from(requireProject(projectId, principal));
  }

  @DeleteMapping("/{projectId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String projectId, Principal principal) {
    projects.delete(requireProject(projectId, principal));
  }

  @GetMapping("/{projectId}/canvas")
  public CanvasPayload getCanvas(@PathVariable String projectId, Principal principal) {
    requireProject(projectId, principal);
    CanvasState state = canvasStates.findById(projectId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canvas not found"));
    return new CanvasPayload(state.nodes, state.links, state.metadata);
  }

  @PutMapping("/{projectId}/canvas")
  @Transactional
  public SaveCanvasResponse saveCanvas(
      @PathVariable String projectId,
      @RequestBody CanvasPayload payload,
      Principal principal
  ) {
    Project project = requireProject(projectId, principal);
    CanvasState state = canvasStates.findById(projectId).orElseGet(() -> {
      CanvasState created = new CanvasState();
      created.projectId = projectId;
      return created;
    });
    state.nodes = payload.nodes();
    state.links = payload.links();
    state.metadata = payload.metadata() == null ? objectMapper.createObjectNode() : payload.metadata();
    state.updatedAt = Instant.now();
    project.updatedAt = state.updatedAt;
    project.version += 1;
    canvasStates.save(state);
    projects.save(project);
    return new SaveCanvasResponse(projectId, "SAVED", state.updatedAt);
  }

  private Project requireProject(String projectId, Principal principal) {
    Project project = projects.findById(projectId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    if (!project.ownerId.equals(principal.getName())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project belongs to another user");
    }
    return project;
  }

  public record CreateProjectRequest(String name, String description) {}
  public record UpsertProjectRequest(
      String name, String description, String problemSlug, Long updatedAt, JsonNode nodes, JsonNode links) {}
  public record FullProject(
      String projectId, String name, String description, String problemSlug,
      long updatedAt, JsonNode nodes, JsonNode links) {}
  public record CanvasPayload(JsonNode nodes, JsonNode links, JsonNode metadata) {}
  public record SaveCanvasResponse(String projectId, String status, Instant updatedAt) {}
  public record ProjectResponse(String projectId, String name, String description, Instant createdAt, int version) {
    static ProjectResponse from(Project project) {
      return new ProjectResponse(project.id, project.name, project.description, project.createdAt, project.version);
    }
  }
}

