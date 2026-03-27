package com.kyoon.resumeagent.Capability;

import java.util.Map;
import static java.util.Map.entry;
import static com.kyoon.resumeagent.Capability.CapabilityCode.*;

public class CapabilityMapping {

    public static final Map<String, CapabilityCode> KEYWORD_MAP = Map.ofEntries(
            // BE_LANG
            entry("Java", BE_LANG), entry("Kotlin", BE_LANG),
            entry("Python", BE_LANG), entry("Node.js", BE_LANG),

            // BE_FRAMEWORK
            entry("Spring", BE_FRAMEWORK), entry("Spring Boot", BE_FRAMEWORK),
            entry("Express", BE_FRAMEWORK), entry("Django", BE_FRAMEWORK),

            // API_DESIGN
            entry("REST", API_DESIGN), entry("API", API_DESIGN),
            entry("GraphQL", API_DESIGN),

            // DB
            entry("MySQL", DB), entry("PostgreSQL", DB),
            entry("MongoDB", DB), entry("SQL", DB),

            // CS
            entry("자료구조", CS), entry("알고리즘", CS),
            entry("운영체제", CS), entry("네트워크", CS),

            // FE_LANG
            entry("JavaScript", FE_LANG), entry("TypeScript", FE_LANG),

            // FE_FRAMEWORK
            entry("React", FE_FRAMEWORK), entry("Vue", FE_FRAMEWORK),
            entry("Next.js", FE_FRAMEWORK),

            // UI
            entry("HTML", UI), entry("CSS", UI),
            entry("UI", UI), entry("UX", UI),

            // DATA
            entry("Pandas", DATA_ANALYSIS), entry("Numpy", DATA_ANALYSIS),
            entry("EDA", DATA_ANALYSIS),

            // ML
            entry("Machine Learning", ML), entry("TensorFlow", ML),
            entry("PyTorch", ML),

            // MATH
            entry("통계", MATH), entry("선형대수", MATH),

            // INFRA
            entry("Linux", INFRA), entry("Server", INFRA),
            entry("Network", INFRA),

            // CLOUD
            entry("AWS", CLOUD), entry("GCP", CLOUD), entry("Azure", CLOUD),

            // DEVOPS
            entry("Docker", DEVOPS), entry("Kubernetes", DEVOPS),
            entry("CI/CD", DEVOPS),

            // COLLAB
            entry("Git", COLLAB), entry("협업", COLLAB), entry("Agile", COLLAB)
    );
}