package com.kyoon.resumeagent.Capability;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static com.kyoon.resumeagent.Capability.CapabilityCode.*;
import static com.kyoon.resumeagent.Capability.CapabilityLevel.*;

public class JobCapabilityProfile {

    public static final Map<String, Map<CapabilityCode, CapabilityWeight>> JOB_PROFILES = Map.ofEntries(

            Map.entry("SW_WEB", Map.of(
                    BE_LANG,      new CapabilityWeight(0.20, L2, true),
                    BE_FRAMEWORK, new CapabilityWeight(0.20, L2, true),
                    DB_USAGE,     new CapabilityWeight(0.10, L2, true),
                    DB_ARCH,      new CapabilityWeight(0.15, L3, false),
                    API_USAGE,    new CapabilityWeight(0.10, L2, true),
                    API_ARCH,     new CapabilityWeight(0.15, L3, false),
                    FE_LANG,      new CapabilityWeight(0.05, L2, false),
                    FE_FRAMEWORK, new CapabilityWeight(0.05, L2, false)
            )),

            Map.entry("SW_AI", Map.of(
                    PYTHON,          new CapabilityWeight(0.20, L2, true),
                    ML_FRAMEWORK,    new CapabilityWeight(0.20, L2, true),
                    DATA_PROCESSING, new CapabilityWeight(0.15, L2, true),
                    ML_MODELING,     new CapabilityWeight(0.25, L3, true),
                    MATH_STATS,      new CapabilityWeight(0.10, L3, false),
                    DATA_VIZ,        new CapabilityWeight(0.10, L2, false)
            )),

            Map.entry("SW_SYSTEM", Map.of(
                    C_CPP,            new CapabilityWeight(0.25, L2, true),
                    LINUX,            new CapabilityWeight(0.20, L2, true),
                    EMBEDDED,         new CapabilityWeight(0.20, L3, true),
                    NETWORK_PROTOCOL, new CapabilityWeight(0.15, L3, false),
                    SENSOR_CONTROL,   new CapabilityWeight(0.10, L2, false),
                    ROS,              new CapabilityWeight(0.10, L2, false)
            )),

            Map.entry("SW_GAME", Map.of(
                    UNITY,            new CapabilityWeight(0.20, L2, true),
                    UNREAL,           new CapabilityWeight(0.15, L2, true),
                    CSHARP,           new CapabilityWeight(0.15, L2, true),
                    CPP_GAME,         new CapabilityWeight(0.10, L2, false),
                    VR_AR,            new CapabilityWeight(0.15, L3, false),
                    THREE_D_MODELING, new CapabilityWeight(0.15, L2, false),
                    GAME_DESIGN,      new CapabilityWeight(0.10, L3, false)
            )),

            Map.entry("SW_SPATIAL", Map.of(
                    GIS,            new CapabilityWeight(0.30, L3, true),
                    DIGITAL_TWIN,   new CapabilityWeight(0.30, L3, true),
                    SPATIAL_PYTHON, new CapabilityWeight(0.20, L2, true),
                    THREE_D_DATA,   new CapabilityWeight(0.20, L2, false)
            )),

            Map.entry("SECURITY_CLOUD", Map.of(
                    CLOUD_USAGE,     new CapabilityWeight(0.15, L2, true),
                    CLOUD_ARCH,      new CapabilityWeight(0.20, L3, true),
                    NETWORK,         new CapabilityWeight(0.15, L3, true),
                    WEB_SECURITY,    new CapabilityWeight(0.15, L3, true),
                    SYSTEM_SECURITY, new CapabilityWeight(0.10, L3, false),
                    LINUX_SERVER,    new CapabilityWeight(0.10, L2, false),
                    CONTAINER,       new CapabilityWeight(0.10, L2, false),
                    CRYPTO,          new CapabilityWeight(0.05, L3, false)
            )),

            Map.entry("SEMI_SW", Map.of(
                    C_CPP,          new CapabilityWeight(0.20, L2, true),
                    PLC_HMI,        new CapabilityWeight(0.20, L2, true),
                    EMBEDDED_FW,    new CapabilityWeight(0.25, L3, true),
                    CIRCUIT_DESIGN, new CapabilityWeight(0.15, L3, false),
                    VERILOG,        new CapabilityWeight(0.10, L2, false),
                    SECS_GEM,       new CapabilityWeight(0.10, L3, false)
            )),

            Map.entry("SEMI_PROCESS", Map.of(
                    PROCESS_KNOWLEDGE, new CapabilityWeight(0.30, L3, true),
                    DEFECT_ANALYSIS,   new CapabilityWeight(0.25, L3, true),
                    CLEANROOM,         new CapabilityWeight(0.15, L2, true),
                    EQUIPMENT_MAINT,   new CapabilityWeight(0.15, L2, false),
                    SOP_COMPLIANCE,    new CapabilityWeight(0.15, L2, false)
            )),

            Map.entry("ELEC_AUTO", Map.of(
                    PLC_CONTROL,       new CapabilityWeight(0.25, L2, true),
                    ROBOT_CONTROL,     new CapabilityWeight(0.20, L2, true),
                    HMI_SCADA,         new CapabilityWeight(0.15, L2, false),
                    PROCESS_OPT,       new CapabilityWeight(0.25, L3, true),
                    ELECTRICAL_SYSTEM, new CapabilityWeight(0.10, L3, false),
                    RENEWABLE_ENERGY,  new CapabilityWeight(0.05, L3, false)
            )),

            Map.entry("MECHANIC", Map.of(
                    CAD_USAGE,     new CapabilityWeight(0.15, L2, true),
                    MECH_DESIGN,   new CapabilityWeight(0.35, L3, true),
                    MECH_ANALYSIS, new CapabilityWeight(0.25, L3, false),
                    MANUFACTURING, new CapabilityWeight(0.15, L2, false),
                    QUALITY_MGMT,  new CapabilityWeight(0.10, L2, false)
            )),

            Map.entry("BIO_PHARMA", Map.of(
                    LAB_SKILLS,        new CapabilityWeight(0.25, L2, true),
                    GMP_COMPLIANCE,    new CapabilityWeight(0.25, L2, true),
                    QUALITY_CONTROL,   new CapabilityWeight(0.25, L3, true),
                    BIO_AI,            new CapabilityWeight(0.15, L3, false),
                    DATA_ANALYSIS_BIO, new CapabilityWeight(0.10, L3, false)
            )),

            Map.entry("ARCHITECTURE", Map.of(
                    CAD_ARCH,          new CapabilityWeight(0.20, L2, true),
                    DESIGN_INTENT,     new CapabilityWeight(0.30, L3, true),
                    REGULATION_COMPLY, new CapabilityWeight(0.20, L3, true),
                    BIM,               new CapabilityWeight(0.15, L3, false),
                    STRUCTURAL_DESIGN, new CapabilityWeight(0.15, L3, false)
            )),

            Map.entry("AVIATION", Map.of(
                    SOP_COMPLIANCE, new CapabilityWeight(0.30, L2, true),
                    MRO_KNOWLEDGE,  new CapabilityWeight(0.30, L3, true),
                    NDT,            new CapabilityWeight(0.20, L3, false),
                    CABIN_SERVICE,  new CapabilityWeight(0.15, L2, false),
                    AVIATION_MGMT,  new CapabilityWeight(0.05, L3, false)
            )),

            Map.entry("BUSINESS", Map.of(
                    DATA_DRIVEN,       new CapabilityWeight(0.20, L2, true),
                    KPI_RESULT,        new CapabilityWeight(0.30, L3, true),
                    STRATEGY_PLANNING, new CapabilityWeight(0.30, L3, true),
                    DIGITAL_MARKETING, new CapabilityWeight(0.10, L2, false),
                    ERP_CRM,           new CapabilityWeight(0.05, L2, false),
                    FINTECH,           new CapabilityWeight(0.05, L3, false)
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