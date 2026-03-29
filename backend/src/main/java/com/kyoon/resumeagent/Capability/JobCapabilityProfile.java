// 5. JobCapabilityProfile.java
package com.kyoon.resumeagent.Capability;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static com.kyoon.resumeagent.Capability.CapabilityCode.*;
import static com.kyoon.resumeagent.Capability.CapabilityLevel.*;

public class JobCapabilityProfile {

    public static final Map<String, Map<CapabilityCode, CapabilityWeight>> JOB_PROFILES = Map.ofEntries(

            Map.entry("SW_WEB", Map.of(
                    BE_LANG,      new CapabilityWeight(0.20, L1_USAGE, true),
                    BE_FRAMEWORK, new CapabilityWeight(0.20, L1_USAGE, true),
                    DB_USAGE,     new CapabilityWeight(0.10, L1_USAGE, true),
                    DB_ARCH,      new CapabilityWeight(0.15, L2_ARCH, false),
                    API_USAGE,    new CapabilityWeight(0.10, L1_USAGE, true),
                    API_ARCH,     new CapabilityWeight(0.15, L2_ARCH, false),
                    FE_LANG,      new CapabilityWeight(0.05, L1_USAGE, false),
                    FE_FRAMEWORK, new CapabilityWeight(0.05, L1_USAGE, false)
            )),

            Map.entry("SW_AI", Map.of(
                    PYTHON,          new CapabilityWeight(0.20, L1_USAGE, true),
                    ML_FRAMEWORK,    new CapabilityWeight(0.20, L1_USAGE, true),
                    DATA_PROCESSING, new CapabilityWeight(0.15, L1_USAGE, true),
                    ML_MODELING,     new CapabilityWeight(0.25, L2_ARCH, true),
                    MATH_STATS,      new CapabilityWeight(0.10, L2_ARCH, false),
                    DATA_VIZ,        new CapabilityWeight(0.10, L1_USAGE, false)
            )),

            Map.entry("SW_SYSTEM", Map.of(
                    C_CPP,            new CapabilityWeight(0.25, L1_USAGE, true),
                    LINUX,            new CapabilityWeight(0.20, L1_USAGE, true),
                    EMBEDDED,         new CapabilityWeight(0.20, L2_ARCH, true),
                    NETWORK_PROTOCOL, new CapabilityWeight(0.15, L2_ARCH, false),
                    SENSOR_CONTROL,   new CapabilityWeight(0.10, L1_USAGE, false),
                    ROS,              new CapabilityWeight(0.10, L1_USAGE, false)
            )),

            Map.entry("SW_GAME", Map.of(
                    UNITY,            new CapabilityWeight(0.20, L1_USAGE, true),
                    UNREAL,           new CapabilityWeight(0.15, L1_USAGE, true),
                    CSHARP,           new CapabilityWeight(0.15, L1_USAGE, true),
                    CPP_GAME,         new CapabilityWeight(0.10, L1_USAGE, false),
                    VR_AR,            new CapabilityWeight(0.15, L2_ARCH, false),
                    THREE_D_MODELING, new CapabilityWeight(0.15, L1_USAGE, false),
                    GAME_DESIGN,      new CapabilityWeight(0.10, L2_ARCH, false)
            )),

            Map.entry("SW_SPATIAL", Map.of(
                    GIS,            new CapabilityWeight(0.30, L2_ARCH, true),
                    DIGITAL_TWIN,   new CapabilityWeight(0.30, L2_ARCH, true),
                    SPATIAL_PYTHON, new CapabilityWeight(0.20, L1_USAGE, true),
                    THREE_D_DATA,   new CapabilityWeight(0.20, L1_USAGE, false)
            )),

            Map.entry("SECURITY_CLOUD", Map.of(
                    CLOUD_USAGE,     new CapabilityWeight(0.15, L1_USAGE, true),
                    CLOUD_ARCH,      new CapabilityWeight(0.20, L2_ARCH, true),
                    NETWORK,         new CapabilityWeight(0.15, L2_ARCH, true),
                    WEB_SECURITY,    new CapabilityWeight(0.15, L2_ARCH, true),
                    SYSTEM_SECURITY, new CapabilityWeight(0.10, L2_ARCH, false),
                    LINUX_SERVER,    new CapabilityWeight(0.10, L1_USAGE, false),
                    CONTAINER,       new CapabilityWeight(0.10, L1_USAGE, false),
                    CRYPTO,          new CapabilityWeight(0.05, L2_ARCH, false)
            )),

            Map.entry("SEMI_SW", Map.of(
                    C_CPP,          new CapabilityWeight(0.20, L1_USAGE, true),
                    PLC_HMI,        new CapabilityWeight(0.20, L1_USAGE, true),
                    EMBEDDED_FW,    new CapabilityWeight(0.25, L2_ARCH, true),
                    CIRCUIT_DESIGN, new CapabilityWeight(0.15, L2_ARCH, false),
                    VERILOG,        new CapabilityWeight(0.10, L1_USAGE, false),
                    SECS_GEM,       new CapabilityWeight(0.10, L2_ARCH, false)
            )),

            Map.entry("SEMI_PROCESS", Map.of(
                    PROCESS_KNOWLEDGE, new CapabilityWeight(0.30, L2_ARCH, true),
                    DEFECT_ANALYSIS,   new CapabilityWeight(0.25, L2_ARCH, true),
                    CLEANROOM,         new CapabilityWeight(0.15, L1_USAGE, true),
                    EQUIPMENT_MAINT,   new CapabilityWeight(0.15, L1_USAGE, false),
                    SOP_COMPLIANCE,    new CapabilityWeight(0.15, L1_USAGE, false)
            )),

            Map.entry("ELEC_AUTO", Map.of(
                    PLC_CONTROL,       new CapabilityWeight(0.25, L1_USAGE, true),
                    ROBOT_CONTROL,     new CapabilityWeight(0.20, L1_USAGE, true),
                    HMI_SCADA,         new CapabilityWeight(0.15, L1_USAGE, false),
                    PROCESS_OPT,       new CapabilityWeight(0.25, L2_ARCH, true),
                    ELECTRICAL_SYSTEM, new CapabilityWeight(0.10, L2_ARCH, false),
                    RENEWABLE_ENERGY,  new CapabilityWeight(0.05, L2_ARCH, false)
            )),

            Map.entry("MECHANIC", Map.of(
                    CAD_USAGE,     new CapabilityWeight(0.15, L1_USAGE, true),
                    MECH_DESIGN,   new CapabilityWeight(0.35, L2_ARCH, true),
                    MECH_ANALYSIS, new CapabilityWeight(0.25, L2_ARCH, false),
                    MANUFACTURING, new CapabilityWeight(0.15, L1_USAGE, false),
                    QUALITY_MGMT,  new CapabilityWeight(0.10, L1_USAGE, false)
            )),

            Map.entry("BIO_PHARMA", Map.of(
                    LAB_SKILLS,        new CapabilityWeight(0.25, L1_USAGE, true),
                    GMP_COMPLIANCE,    new CapabilityWeight(0.25, L1_USAGE, true),
                    QUALITY_CONTROL,   new CapabilityWeight(0.25, L2_ARCH, true),
                    BIO_AI,            new CapabilityWeight(0.15, L2_ARCH, false),
                    DATA_ANALYSIS_BIO, new CapabilityWeight(0.10, L2_ARCH, false)
            )),

            Map.entry("ARCHITECTURE", Map.of(
                    CAD_ARCH,          new CapabilityWeight(0.20, L1_USAGE, true),
                    DESIGN_INTENT,     new CapabilityWeight(0.30, L2_ARCH, true),
                    REGULATION_COMPLY, new CapabilityWeight(0.20, L2_ARCH, true),
                    BIM,               new CapabilityWeight(0.15, L2_ARCH, false),
                    STRUCTURAL_DESIGN, new CapabilityWeight(0.15, L2_ARCH, false)
            )),

            Map.entry("AVIATION", Map.of(
                    SOP_COMPLIANCE, new CapabilityWeight(0.30, L1_USAGE, true),
                    MRO_KNOWLEDGE,  new CapabilityWeight(0.30, L2_ARCH, true),
                    NDT,            new CapabilityWeight(0.20, L2_ARCH, false),
                    CABIN_SERVICE,  new CapabilityWeight(0.15, L1_USAGE, false),
                    AVIATION_MGMT,  new CapabilityWeight(0.05, L2_ARCH, false)
            )),

            Map.entry("BUSINESS", Map.of(
                    DATA_DRIVEN,       new CapabilityWeight(0.20, L1_USAGE, true),
                    KPI_RESULT,        new CapabilityWeight(0.30, L2_ARCH, true),
                    STRATEGY_PLANNING, new CapabilityWeight(0.30, L2_ARCH, true),
                    DIGITAL_MARKETING, new CapabilityWeight(0.10, L1_USAGE, false),
                    ERP_CRM,           new CapabilityWeight(0.05, L1_USAGE, false),
                    FINTECH,           new CapabilityWeight(0.05, L2_ARCH, false)
            ))
    );

    public static String getRelevantCodeNames(String groupCode) {
        Map<CapabilityCode, CapabilityWeight> profile = JOB_PROFILES.get(groupCode);
        if (profile == null) return Arrays.stream(CapabilityCode.values())
                .map(e -> e.name() + "(" + e.getDescription() + ")")
                .collect(Collectors.joining(", "));
        return profile.keySet().stream()
                .map(e -> e.name() + "(" + e.getDescription() + ")")
                .collect(Collectors.joining(", "));
    }
}