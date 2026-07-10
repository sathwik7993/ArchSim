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
  public record CanvasPayload(JsonNode nodes, JsonNode links, JsonNode metadata) {}
  public record SaveCanvasResponse(String projectId, String status, Instant updatedAt) {}
  public record ProjectResponse(String projectId, String name, String description, Instant createdAt, int version) {
    static ProjectResponse from(Project project) {
      return new ProjectResponse(project.id, project.name, project.description, project.createdAt, project.version);
    }
  }
}

