package com.designlab.archsim.simulation;

public record SimulationEvent(long scheduledTimeMs, String eventType, String targetId, Runnable handler) {}

