// 2. CapabilityWeight.java
package com.kyoon.resumeagent.Capability;

public record CapabilityWeight(
        double weight,
        CapabilityLevel level,
        boolean isCore
) {}