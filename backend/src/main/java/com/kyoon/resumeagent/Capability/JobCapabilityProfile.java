package com.kyoon.resumeagent.Capability;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static com.kyoon.resumeagent.Capability.CapabilityCode.*;
import static com.kyoon.resumeagent.Capability.CapabilityLevel.*;

public class JobCapabilityProfile {

    public static final Map<String, Map<CapabilityCode, CapabilityWeight>> JOB_PROFILES = Map.ofEntries(

            // ── SW_WEB ───────────────────────────────────────────────
            Map.entry("SW_WEB_BE", Map.ofEntries(
                    Map.entry(BE_LANG,                  new CapabilityWeight(0.25, L2, true)),
                    Map.entry(BE_FRAMEWORK,             new CapabilityWeight(0.25, L2, true)),
                    Map.entry(DB_USAGE,                 new CapabilityWeight(0.15, L2, true)),
                    Map.entry(API_USAGE,                new CapabilityWeight(0.10, L2, true)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.10, L3, false)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.08, L2, false)),
                    Map.entry(SW_MAINTENANCE,           new CapabilityWeight(0.07, L2, false))
            )),

            Map.entry("SW_WEB_FE", Map.ofEntries(
                    Map.entry(FE_LANG,                  new CapabilityWeight(0.25, L2, true)),
                    Map.entry(FE_FRAMEWORK,             new CapabilityWeight(0.25, L2, true)),
                    Map.entry(API_USAGE,                new CapabilityWeight(0.15, L2, true)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.10, L2, false)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.10, L2, false)),
                    Map.entry(SW_REQUIREMENT_ANALYSIS,  new CapabilityWeight(0.08, L2, false)),
                    Map.entry(SW_MAINTENANCE,           new CapabilityWeight(0.07, L2, false))
            )),

            Map.entry("SW_WEB_DB", Map.ofEntries(
                    Map.entry(DB_USAGE,                 new CapabilityWeight(0.30, L2, true)),
                    Map.entry(DB_ARCH,                  new CapabilityWeight(0.30, L3, true)),
                    Map.entry(BE_LANG,                  new CapabilityWeight(0.15, L2, false)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.10, L3, false)),
                    Map.entry(SW_MAINTENANCE,           new CapabilityWeight(0.08, L2, false)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.07, L2, false))
            )),

            Map.entry("SW_WEB_API", Map.ofEntries(
                    Map.entry(API_USAGE,                new CapabilityWeight(0.25, L2, true)),
                    Map.entry(API_ARCH,                 new CapabilityWeight(0.25, L3, true)),
                    Map.entry(BE_LANG,                  new CapabilityWeight(0.15, L2, true)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.15, L3, false)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.10, L2, false)),
                    Map.entry(SW_REQUIREMENT_ANALYSIS,  new CapabilityWeight(0.10, L2, false))
            )),

            // ── SW_AI ────────────────────────────────────────────────
            Map.entry("SW_AI_MODEL", Map.ofEntries(
                    Map.entry(ML_MODELING,              new CapabilityWeight(0.30, L3, true)),
                    Map.entry(ML_FRAMEWORK,             new CapabilityWeight(0.20, L2, true)),
                    Map.entry(PYTHON,                   new CapabilityWeight(0.15, L2, true)),
                    Map.entry(MATH_STATS,               new CapabilityWeight(0.15, L3, true)),
                    Map.entry(MODEL_EVALUATION,         new CapabilityWeight(0.10, L2, false)),
                    Map.entry(DATA_PROCESSING,          new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SW_AI_DATA", Map.ofEntries(
                    Map.entry(DATA_PROCESSING,          new CapabilityWeight(0.25, L2, true)),
                    Map.entry(DATA_COLLECTION,          new CapabilityWeight(0.20, L2, true)),
                    Map.entry(PYTHON,                   new CapabilityWeight(0.20, L2, true)),
                    Map.entry(MATH_STATS,               new CapabilityWeight(0.15, L2, false)),
                    Map.entry(DATA_VIZ,                 new CapabilityWeight(0.10, L2, false)),
                    Map.entry(DB_USAGE,                 new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SW_AI_SERVICE", Map.ofEntries(
                    Map.entry(AI_DEPLOYMENT,            new CapabilityWeight(0.30, L3, true)),
                    Map.entry(BE_FRAMEWORK,             new CapabilityWeight(0.20, L2, true)),
                    Map.entry(ML_FRAMEWORK,             new CapabilityWeight(0.15, L2, true)),
                    Map.entry(CLOUD_USAGE,              new CapabilityWeight(0.15, L2, false)),
                    Map.entry(API_ARCH,                 new CapabilityWeight(0.10, L3, false)),
                    Map.entry(CONTAINER,                new CapabilityWeight(0.10, L2, false))
            )),

            // ── SW_SYSTEM ────────────────────────────────────────────
            Map.entry("SW_SYSTEM_EMBEDDED", Map.ofEntries(
                    Map.entry(EMBEDDED,                 new CapabilityWeight(0.25, L3, true)),
                    Map.entry(C_CPP,                    new CapabilityWeight(0.25, L2, true)),
                    Map.entry(RTOS,                     new CapabilityWeight(0.15, L2, true)),
                    Map.entry(DRIVER_DEV,               new CapabilityWeight(0.15, L3, false)),
                    Map.entry(HW_SW_INTEGRATION,        new CapabilityWeight(0.10, L2, false)),
                    Map.entry(LINUX,                    new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SW_SYSTEM_NETWORK", Map.ofEntries(
                    Map.entry(NETWORK_PROTOCOL,         new CapabilityWeight(0.30, L3, true)),
                    Map.entry(NETWORK,                  new CapabilityWeight(0.25, L3, true)),
                    Map.entry(LINUX,                    new CapabilityWeight(0.15, L2, true)),
                    Map.entry(C_CPP,                    new CapabilityWeight(0.15, L2, false)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.08, L3, false)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.07, L2, false))
            )),

            Map.entry("SW_SYSTEM_OS", Map.ofEntries(
                    Map.entry(C_CPP,                    new CapabilityWeight(0.30, L3, true)),
                    Map.entry(LINUX,                    new CapabilityWeight(0.25, L3, true)),
                    Map.entry(DRIVER_DEV,               new CapabilityWeight(0.20, L3, true)),
                    Map.entry(CS_FUNDAMENTAL,           new CapabilityWeight(0.15, L3, false)),
                    Map.entry(HW_SW_INTEGRATION,        new CapabilityWeight(0.10, L2, false))
            )),

            // ── SW_GAME ──────────────────────────────────────────────
            Map.entry("SW_GAME_CLIENT", Map.ofEntries(
                    Map.entry(UNITY,                    new CapabilityWeight(0.20, L2, true)),
                    Map.entry(UNREAL,                   new CapabilityWeight(0.20, L2, true)),
                    Map.entry(CSHARP,                   new CapabilityWeight(0.15, L2, true)),
                    Map.entry(CPP_GAME,                 new CapabilityWeight(0.15, L2, true)),
                    Map.entry(GAME_LOGIC,               new CapabilityWeight(0.15, L3, false)),
                    Map.entry(GAME_UI,                  new CapabilityWeight(0.08, L2, false)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.07, L2, false))
            )),

            Map.entry("SW_GAME_SERVER", Map.ofEntries(
                    Map.entry(BE_LANG,                  new CapabilityWeight(0.25, L2, true)),
                    Map.entry(BE_FRAMEWORK,             new CapabilityWeight(0.20, L2, true)),
                    Map.entry(GAME_NETWORK,             new CapabilityWeight(0.25, L3, true)),
                    Map.entry(DB_USAGE,                 new CapabilityWeight(0.10, L2, false)),
                    Map.entry(API_ARCH,                 new CapabilityWeight(0.10, L3, false)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.10, L3, false))
            )),

            Map.entry("SW_GAME_GRAPHIC", Map.ofEntries(
                    Map.entry(THREE_D_MODELING,         new CapabilityWeight(0.35, L2, true)),
                    Map.entry(VR_AR,                    new CapabilityWeight(0.25, L3, true)),
                    Map.entry(UNITY,                    new CapabilityWeight(0.15, L2, false)),
                    Map.entry(UNREAL,                   new CapabilityWeight(0.15, L2, false)),
                    Map.entry(TOOL_PROFICIENCY,         new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SW_GAME_PLANNING", Map.ofEntries(
                    Map.entry(GAME_DESIGN,              new CapabilityWeight(0.40, L3, true)),
                    Map.entry(GAME_LOGIC,               new CapabilityWeight(0.20, L2, true)),
                    Map.entry(SW_REQUIREMENT_ANALYSIS,  new CapabilityWeight(0.15, L2, false)),
                    Map.entry(DOCUMENTATION,            new CapabilityWeight(0.15, L2, false)),
                    Map.entry(DATA_DRIVEN,              new CapabilityWeight(0.10, L2, false))
            )),

            // ── SW_SPATIAL ───────────────────────────────────────────
            Map.entry("SW_SPATIAL_GIS", Map.ofEntries(
                    Map.entry(GIS,                      new CapabilityWeight(0.40, L3, true)),
                    Map.entry(SPATIAL_PYTHON,           new CapabilityWeight(0.25, L2, true)),
                    Map.entry(DB_USAGE,                 new CapabilityWeight(0.15, L2, false)),
                    Map.entry(THREE_D_DATA,             new CapabilityWeight(0.10, L2, false)),
                    Map.entry(DATA_VIZ,                 new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SW_SPATIAL_ANALYSIS", Map.ofEntries(
                    Map.entry(SPATIAL_PYTHON,           new CapabilityWeight(0.25, L2, true)),
                    Map.entry(THREE_D_DATA,             new CapabilityWeight(0.25, L3, true)),
                    Map.entry(DIGITAL_TWIN,             new CapabilityWeight(0.20, L3, true)),
                    Map.entry(GIS,                      new CapabilityWeight(0.15, L2, false)),
                    Map.entry(DATA_PROCESSING,          new CapabilityWeight(0.15, L2, false))
            )),

            // ── INF (인프라/보안) ──────────────────────────────────────
            Map.entry("INF_CLOUD_ARCH", Map.ofEntries(
                    Map.entry(CLOUD_ARCH,               new CapabilityWeight(0.30, L3, true)),
                    Map.entry(CLOUD_USAGE,              new CapabilityWeight(0.20, L2, true)),
                    Map.entry(CONTAINER,                new CapabilityWeight(0.15, L2, true)),
                    Map.entry(NETWORK,                  new CapabilityWeight(0.15, L3, false)),
                    Map.entry(LINUX_SERVER,             new CapabilityWeight(0.10, L2, false)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.10, L3, false))
            )),

            Map.entry("INF_DEVOPS", Map.ofEntries(
                    Map.entry(DEVOPS_PIPELINE,          new CapabilityWeight(0.30, L3, true)),
                    Map.entry(CONTAINER,                new CapabilityWeight(0.25, L2, true)),
                    Map.entry(LINUX_SERVER,             new CapabilityWeight(0.15, L2, true)),
                    Map.entry(MONITORING,               new CapabilityWeight(0.15, L2, false)),
                    Map.entry(CLOUD_USAGE,              new CapabilityWeight(0.08, L2, false)),
                    Map.entry(SW_MAINTENANCE,           new CapabilityWeight(0.07, L2, false))
            )),

            Map.entry("INF_SECURITY_APP", Map.ofEntries(
                    Map.entry(WEB_SECURITY,             new CapabilityWeight(0.35, L3, true)),
                    Map.entry(BE_LANG,                  new CapabilityWeight(0.20, L2, true)),
                    Map.entry(SW_TEST,                  new CapabilityWeight(0.15, L2, false)),
                    Map.entry(INCIDENT_RESPONSE,        new CapabilityWeight(0.15, L3, false)),
                    Map.entry(NETWORK,                  new CapabilityWeight(0.15, L2, false))
            )),

            Map.entry("INF_SECURITY_SYSTEM", Map.ofEntries(
                    Map.entry(SYSTEM_SECURITY,          new CapabilityWeight(0.35, L3, true)),
                    Map.entry(LINUX_SERVER,             new CapabilityWeight(0.20, L2, true)),
                    Map.entry(CRYPTO,                   new CapabilityWeight(0.15, L3, true)),
                    Map.entry(INCIDENT_RESPONSE,        new CapabilityWeight(0.15, L3, false)),
                    Map.entry(MONITORING,               new CapabilityWeight(0.15, L2, false))
            )),

            Map.entry("INF_SECURITY_NETWORK", Map.ofEntries(
                    Map.entry(NETWORK,                  new CapabilityWeight(0.35, L3, true)),
                    Map.entry(SYSTEM_SECURITY,          new CapabilityWeight(0.20, L3, true)),
                    Map.entry(CRYPTO,                   new CapabilityWeight(0.15, L3, false)),
                    Map.entry(MONITORING,               new CapabilityWeight(0.15, L2, false)),
                    Map.entry(INCIDENT_RESPONSE,        new CapabilityWeight(0.15, L3, false))
            )),

            // ── ENG_SEMI ─────────────────────────────────────────────
            Map.entry("ENG_SEMI_FW", Map.ofEntries(
                    Map.entry(EMBEDDED_FW,              new CapabilityWeight(0.30, L3, true)),
                    Map.entry(C_CPP,                    new CapabilityWeight(0.20, L2, true)),
                    Map.entry(RTOS,                     new CapabilityWeight(0.20, L2, true)),
                    Map.entry(HW_INTERFACE,             new CapabilityWeight(0.15, L2, false)),
                    Map.entry(CIRCUIT_DESIGN,           new CapabilityWeight(0.08, L3, false)),
                    Map.entry(SECS_GEM,                 new CapabilityWeight(0.07, L3, false))
            )),

            Map.entry("ENG_SEMI_CONTROL", Map.ofEntries(
                    Map.entry(PLC_HMI,                  new CapabilityWeight(0.30, L2, true)),
                    Map.entry(REALTIME_CONTROL,         new CapabilityWeight(0.25, L3, true)),
                    Map.entry(HW_INTERFACE,             new CapabilityWeight(0.20, L2, true)),
                    Map.entry(VERILOG,                  new CapabilityWeight(0.15, L3, false)),
                    Map.entry(CIRCUIT_DESIGN,           new CapabilityWeight(0.10, L3, false))
            )),

            Map.entry("ENG_SEMI_PROCESS", Map.ofEntries(
                    Map.entry(PROCESS_KNOWLEDGE,        new CapabilityWeight(0.35, L3, true)),
                    Map.entry(DEFECT_ANALYSIS,          new CapabilityWeight(0.25, L3, true)),
                    Map.entry(CLEANROOM,                new CapabilityWeight(0.15, L2, true)),
                    Map.entry(YIELD_ANALYSIS,           new CapabilityWeight(0.15, L3, false)),
                    Map.entry(SOP_COMPLIANCE,           new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("ENG_SEMI_YIELD", Map.ofEntries(
                    Map.entry(YIELD_ANALYSIS,           new CapabilityWeight(0.35, L3, true)),
                    Map.entry(DEFECT_ANALYSIS,          new CapabilityWeight(0.25, L3, true)),
                    Map.entry(PROCESS_IMPROVEMENT,      new CapabilityWeight(0.20, L3, true)),
                    Map.entry(PROCESS_KNOWLEDGE,        new CapabilityWeight(0.10, L2, false)),
                    Map.entry(DATA_DRIVEN,              new CapabilityWeight(0.10, L2, false))
            )),

            // ── ENG_AUTO ─────────────────────────────────────────────
            Map.entry("ENG_AUTO_CONTROL", Map.ofEntries(
                    Map.entry(PLC_CONTROL,              new CapabilityWeight(0.30, L2, true)),
                    Map.entry(CONTROL_LOGIC,            new CapabilityWeight(0.25, L3, true)),
                    Map.entry(HMI_SCADA,                new CapabilityWeight(0.15, L2, false)),
                    Map.entry(ELECTRICAL_SYSTEM,        new CapabilityWeight(0.15, L3, false)),
                    Map.entry(REALTIME_CONTROL,         new CapabilityWeight(0.15, L3, false))
            )),

            Map.entry("ENG_AUTO_ROBOT", Map.ofEntries(
                    Map.entry(ROBOT_CONTROL,            new CapabilityWeight(0.35, L2, true)),
                    Map.entry(ROS,                      new CapabilityWeight(0.25, L3, true)),
                    Map.entry(SENSOR_CONTROL,           new CapabilityWeight(0.15, L2, true)),
                    Map.entry(CONTROL_LOGIC,            new CapabilityWeight(0.15, L3, false)),
                    Map.entry(SYSTEM_INTEGRATION,       new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("ENG_AUTO_PROCESS", Map.ofEntries(
                    Map.entry(PROCESS_OPT,              new CapabilityWeight(0.30, L3, true)),
                    Map.entry(SYSTEM_INTEGRATION,       new CapabilityWeight(0.25, L3, true)),
                    Map.entry(HMI_SCADA,                new CapabilityWeight(0.15, L2, false)),
                    Map.entry(PROCESS_IMPROVEMENT,      new CapabilityWeight(0.15, L3, false)),
                    Map.entry(QUALITY_MGMT,             new CapabilityWeight(0.15, L2, false))
            )),

            // ── ENG_MECH ─────────────────────────────────────────────
            Map.entry("ENG_MECH_DESIGN", Map.ofEntries(
                    Map.entry(MECH_DESIGN,              new CapabilityWeight(0.40, L3, true)),
                    Map.entry(CAD_USAGE,                new CapabilityWeight(0.20, L2, true)),
                    Map.entry(TOLERANCE_ANALYSIS,       new CapabilityWeight(0.15, L3, false)),
                    Map.entry(MATERIAL_SELECTION,       new CapabilityWeight(0.15, L2, false)),
                    Map.entry(MECH_ANALYSIS,            new CapabilityWeight(0.10, L3, false))
            )),

            Map.entry("ENG_MECH_ANALYSIS", Map.ofEntries(
                    Map.entry(MECH_ANALYSIS,            new CapabilityWeight(0.40, L3, true)),
                    Map.entry(MECH_DESIGN,              new CapabilityWeight(0.20, L3, true)),
                    Map.entry(MATERIAL_SELECTION,       new CapabilityWeight(0.15, L3, false)),
                    Map.entry(CAD_USAGE,                new CapabilityWeight(0.15, L2, false)),
                    Map.entry(MATH_STATS,               new CapabilityWeight(0.10, L3, false))
            )),

            Map.entry("ENG_MECH_PRODUCTION", Map.ofEntries(
                    Map.entry(MANUFACTURING,            new CapabilityWeight(0.35, L2, true)),
                    Map.entry(CAD_USAGE,                new CapabilityWeight(0.20, L2, true)),
                    Map.entry(QUALITY_MGMT,             new CapabilityWeight(0.20, L2, true)),
                    Map.entry(MECH_DESIGN,              new CapabilityWeight(0.15, L2, false)),
                    Map.entry(TOLERANCE_ANALYSIS,       new CapabilityWeight(0.10, L2, false))
            )),

            // ── SCI_BIO ──────────────────────────────────────────────
            Map.entry("SCI_BIO_PROCESS", Map.ofEntries(
                    Map.entry(BIO_PROCESS,              new CapabilityWeight(0.35, L2, true)),
                    Map.entry(LAB_SKILLS,               new CapabilityWeight(0.25, L2, true)),
                    Map.entry(GMP_COMPLIANCE,           new CapabilityWeight(0.20, L2, true)),
                    Map.entry(SOP_COMPLIANCE,           new CapabilityWeight(0.10, L2, false)),
                    Map.entry(QUALITY_CONTROL,          new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SCI_BIO_QC", Map.ofEntries(
                    Map.entry(QUALITY_CONTROL,          new CapabilityWeight(0.30, L3, true)),
                    Map.entry(VALIDATION,               new CapabilityWeight(0.25, L3, true)),
                    Map.entry(GMP_COMPLIANCE,           new CapabilityWeight(0.20, L2, true)),
                    Map.entry(LAB_SKILLS,               new CapabilityWeight(0.15, L2, false)),
                    Map.entry(DOCUMENTATION,            new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("SCI_BIO_ANALYSIS", Map.ofEntries(
                    Map.entry(LAB_SKILLS,               new CapabilityWeight(0.30, L2, true)),
                    Map.entry(DATA_ANALYSIS_BIO,        new CapabilityWeight(0.25, L3, true)),
                    Map.entry(BIO_AI,                   new CapabilityWeight(0.20, L3, false)),
                    Map.entry(MATH_STATS,               new CapabilityWeight(0.15, L2, false)),
                    Map.entry(PYTHON,                   new CapabilityWeight(0.10, L2, false))
            )),

            // ── ENG_ARCH ─────────────────────────────────────────────
            Map.entry("ENG_ARCH_DESIGN", Map.ofEntries(
                    Map.entry(DESIGN_INTENT,            new CapabilityWeight(0.35, L3, true)),
                    Map.entry(CAD_ARCH,                 new CapabilityWeight(0.25, L2, true)),
                    Map.entry(REGULATION_COMPLY,        new CapabilityWeight(0.15, L3, false)),
                    Map.entry(SITE_ANALYSIS,            new CapabilityWeight(0.15, L2, false)),
                    Map.entry(COST_ESTIMATION,          new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("ENG_ARCH_BIM", Map.ofEntries(
                    Map.entry(BIM,                      new CapabilityWeight(0.40, L3, true)),
                    Map.entry(CAD_ARCH,                 new CapabilityWeight(0.25, L2, true)),
                    Map.entry(STRUCTURAL_DESIGN,        new CapabilityWeight(0.15, L3, false)),
                    Map.entry(COST_ESTIMATION,          new CapabilityWeight(0.10, L2, false)),
                    Map.entry(SW_DESIGN,                new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("ENG_ARCH_REGULATION", Map.ofEntries(
                    Map.entry(REGULATION_COMPLY,        new CapabilityWeight(0.40, L3, true)),
                    Map.entry(SITE_ANALYSIS,            new CapabilityWeight(0.25, L3, true)),
                    Map.entry(DESIGN_INTENT,            new CapabilityWeight(0.15, L2, false)),
                    Map.entry(COST_ESTIMATION,          new CapabilityWeight(0.10, L2, false)),
                    Map.entry(DOCUMENTATION,            new CapabilityWeight(0.10, L2, false))
            )),

            // ── ENG_AVI ──────────────────────────────────────────────
            Map.entry("ENG_AVI_MAINT", Map.ofEntries(
                    Map.entry(MRO_KNOWLEDGE,            new CapabilityWeight(0.30, L3, true)),
                    Map.entry(MAINTENANCE_PROCESS,      new CapabilityWeight(0.30, L2, true)),
                    Map.entry(NDT,                      new CapabilityWeight(0.20, L3, false)),
                    Map.entry(SOP_COMPLIANCE,           new CapabilityWeight(0.10, L2, false)),
                    Map.entry(SAFETY_MANAGEMENT,        new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("ENG_AVI_QUALITY", Map.ofEntries(
                    Map.entry(SAFETY_MANAGEMENT,        new CapabilityWeight(0.30, L3, true)),
                    Map.entry(QUALITY_MGMT,             new CapabilityWeight(0.25, L3, true)),
                    Map.entry(NDT,                      new CapabilityWeight(0.20, L3, false)),
                    Map.entry(DOCUMENTATION,            new CapabilityWeight(0.15, L2, false)),
                    Map.entry(SOP_COMPLIANCE,           new CapabilityWeight(0.10, L2, false))
            )),

            // ── BIZ ──────────────────────────────────────────────────
            Map.entry("BIZ_STRATEGY", Map.ofEntries(
                    Map.entry(STRATEGY_PLANNING,        new CapabilityWeight(0.35, L3, true)),
                    Map.entry(KPI_RESULT,               new CapabilityWeight(0.25, L3, true)),
                    Map.entry(MARKET_ANALYSIS,          new CapabilityWeight(0.15, L2, false)),
                    Map.entry(FINANCIAL_ANALYSIS,       new CapabilityWeight(0.15, L3, false)),
                    Map.entry(BUSINESS_MODEL,           new CapabilityWeight(0.10, L3, false))
            )),

            Map.entry("BIZ_MARKETING", Map.ofEntries(
                    Map.entry(DIGITAL_MARKETING,        new CapabilityWeight(0.35, L2, true)),
                    Map.entry(MARKET_ANALYSIS,          new CapabilityWeight(0.25, L2, true)),
                    Map.entry(DATA_DRIVEN,              new CapabilityWeight(0.20, L2, false)),
                    Map.entry(KPI_RESULT,               new CapabilityWeight(0.10, L2, false)),
                    Map.entry(ERP_CRM,                  new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("BIZ_SALES", Map.ofEntries(
                    Map.entry(KPI_RESULT,               new CapabilityWeight(0.30, L2, true)),
                    Map.entry(ERP_CRM,                  new CapabilityWeight(0.25, L2, true)),
                    Map.entry(MARKET_ANALYSIS,          new CapabilityWeight(0.20, L2, false)),
                    Map.entry(DATA_DRIVEN,              new CapabilityWeight(0.15, L2, false)),
                    Map.entry(DIGITAL_MARKETING,        new CapabilityWeight(0.10, L2, false))
            )),

            Map.entry("BIZ_DATA", Map.ofEntries(
                    Map.entry(DATA_DRIVEN,              new CapabilityWeight(0.30, L3, true)),
                    Map.entry(DATA_PROCESSING,          new CapabilityWeight(0.25, L2, true)),
                    Map.entry(FINANCIAL_ANALYSIS,       new CapabilityWeight(0.15, L2, false)),
                    Map.entry(KPI_RESULT,               new CapabilityWeight(0.15, L2, false)),
                    Map.entry(PYTHON,                   new CapabilityWeight(0.15, L2, false))
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