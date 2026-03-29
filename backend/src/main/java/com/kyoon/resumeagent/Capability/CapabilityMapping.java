// 4. CapabilityMapping.java
package com.kyoon.resumeagent.Capability;

import java.util.Map;
import static java.util.Map.entry;
import static com.kyoon.resumeagent.Capability.CapabilityCode.*;

public class CapabilityMapping {

    public static final Map<String, CapabilityCode> KEYWORD_MAP = Map.ofEntries(
            entry("Java", BE_LANG), entry("Kotlin", BE_LANG),
            entry("Node.js", BE_LANG), entry("PHP", BE_LANG),
            entry("Spring", BE_FRAMEWORK), entry("Spring Boot", BE_FRAMEWORK),
            entry("Express", BE_FRAMEWORK), entry("Django", BE_FRAMEWORK),
            entry("FastAPI", BE_FRAMEWORK), entry("NestJS", BE_FRAMEWORK),
            entry("JavaScript", FE_LANG), entry("TypeScript", FE_LANG),
            entry("React", FE_FRAMEWORK), entry("Vue", FE_FRAMEWORK),
            entry("Next.js", FE_FRAMEWORK), entry("Angular", FE_FRAMEWORK),

            entry("MySQL", DB_USAGE), entry("PostgreSQL", DB_USAGE),
            entry("MongoDB", DB_USAGE), entry("JPA", DB_USAGE),
            entry("MyBatis", DB_USAGE), entry("Redis", DB_USAGE), entry("SQL", DB_USAGE),
            entry("ERD", DB_ARCH), entry("쿼리 튜닝", DB_ARCH), entry("데이터 모델링", DB_ARCH),

            entry("REST", API_USAGE), entry("API", API_USAGE), entry("Swagger", API_USAGE),
            entry("GraphQL", API_ARCH), entry("MSA", API_ARCH),

            entry("자료구조", CS_FUNDAMENTAL), entry("알고리즘", CS_FUNDAMENTAL),
            entry("운영체제", CS_FUNDAMENTAL), entry("네트워크", CS_FUNDAMENTAL),

            entry("Python", PYTHON),
            entry("TensorFlow", ML_FRAMEWORK), entry("PyTorch", ML_FRAMEWORK),
            entry("Keras", ML_FRAMEWORK), entry("Scikit-learn", ML_FRAMEWORK),
            entry("Pandas", DATA_PROCESSING), entry("Numpy", DATA_PROCESSING),
            entry("데이터 전처리", DATA_PROCESSING), entry("EDA", DATA_PROCESSING),
            entry("Matplotlib", DATA_VIZ), entry("Seaborn", DATA_VIZ),
            entry("Tableau", DATA_VIZ), entry("Power BI", DATA_VIZ),
            entry("머신러닝", ML_MODELING), entry("딥러닝", ML_MODELING),
            entry("Machine Learning", ML_MODELING), entry("MLOps", ML_MODELING),
            entry("통계", MATH_STATS), entry("선형대수", MATH_STATS),
            entry("확률", MATH_STATS), entry("수치해석", MATH_STATS),

            entry("C", C_CPP), entry("C++", C_CPP), entry("C/C++", C_CPP),
            entry("Linux", LINUX), entry("Ubuntu", LINUX),
            entry("Shell", LINUX), entry("Bash", LINUX),
            entry("Arduino", EMBEDDED), entry("Raspberry Pi", EMBEDDED),
            entry("임베디드", EMBEDDED), entry("Embedded", EMBEDDED),
            entry("마이크로컨트롤러", EMBEDDED), entry("MCU", EMBEDDED),
            entry("ROS", ROS), entry("ROS2", ROS),
            entry("TCP/IP", NETWORK_PROTOCOL), entry("IoT", NETWORK_PROTOCOL),
            entry("MQTT", NETWORK_PROTOCOL), entry("통신 프로토콜", NETWORK_PROTOCOL),
            entry("센서", SENSOR_CONTROL), entry("액추에이터", SENSOR_CONTROL), entry("모터 제어", SENSOR_CONTROL),

            entry("Unity", UNITY), entry("Unreal", UNREAL), entry("Unreal Engine", UNREAL),
            entry("C#", CSHARP), entry("Blueprint", CPP_GAME),
            entry("VR", VR_AR), entry("AR", VR_AR), entry("메타버스", VR_AR), entry("XR", VR_AR),
            entry("Maya", THREE_D_MODELING), entry("Blender", THREE_D_MODELING), entry("3D 모델링", THREE_D_MODELING),

            entry("GIS", GIS), entry("지리정보", GIS), entry("ArcGIS", GIS),
            entry("디지털 트윈", DIGITAL_TWIN), entry("Digital Twin", DIGITAL_TWIN),
            entry("3D 데이터", THREE_D_DATA), entry("포인트 클라우드", THREE_D_DATA),

            entry("AWS", CLOUD_USAGE), entry("GCP", CLOUD_USAGE),
            entry("Azure", CLOUD_USAGE), entry("클라우드", CLOUD_USAGE),
            entry("클라우드 아키텍처", CLOUD_ARCH),
            entry("라우팅", NETWORK), entry("스위칭", NETWORK),
            entry("방화벽", NETWORK), entry("네트워크 설계", NETWORK),
            entry("웹 보안", WEB_SECURITY), entry("취약점 분석", WEB_SECURITY),
            entry("OWASP", WEB_SECURITY), entry("모의해킹", WEB_SECURITY),
            entry("시스템 보안", SYSTEM_SECURITY), entry("포렌식", SYSTEM_SECURITY), entry("악성코드", SYSTEM_SECURITY),
            entry("서버 운영", LINUX_SERVER), entry("가상화", LINUX_SERVER),
            entry("Docker", CONTAINER), entry("Kubernetes", CONTAINER),
            entry("CI/CD", CONTAINER), entry("컨테이너", CONTAINER),
            entry("암호학", CRYPTO), entry("암호화", CRYPTO), entry("PKI", CRYPTO),

            entry("PLC", PLC_HMI), entry("HMI", PLC_HMI),
            entry("시퀀스 제어", PLC_HMI), entry("래더 다이어그램", PLC_HMI),
            entry("펌웨어", EMBEDDED_FW), entry("Firmware", EMBEDDED_FW), entry("RTOS", EMBEDDED_FW),
            entry("전자회로", CIRCUIT_DESIGN), entry("EDA", CIRCUIT_DESIGN),
            entry("OrCAD", CIRCUIT_DESIGN), entry("Altium", CIRCUIT_DESIGN),
            entry("Verilog", VERILOG), entry("HDL", VERILOG),
            entry("FPGA", VERILOG), entry("SoC", VERILOG),
            entry("SECS", SECS_GEM), entry("GEM", SECS_GEM), entry("반도체 통신", SECS_GEM),

            entry("8대 공정", PROCESS_KNOWLEDGE), entry("포토", PROCESS_KNOWLEDGE),
            entry("식각", PROCESS_KNOWLEDGE), entry("증착", PROCESS_KNOWLEDGE),
            entry("클린룸", CLEANROOM), entry("GMP", GMP_COMPLIANCE),
            entry("SOP", SOP_COMPLIANCE), entry("설비 유지보수", EQUIPMENT_MAINT), entry("PM", EQUIPMENT_MAINT),

            entry("산업용 로봇", ROBOT_CONTROL), entry("로봇 티칭", ROBOT_CONTROL),
            entry("SCADA", HMI_SCADA), entry("신재생 에너지", RENEWABLE_ENERGY),

            entry("SolidWorks", CAD_USAGE), entry("CATIA", CAD_USAGE),
            entry("Inventor", CAD_USAGE), entry("AutoCAD", CAD_USAGE),
            entry("기구 설계", MECH_DESIGN), entry("CAE", MECH_ANALYSIS),
            entry("CNC", MANUFACTURING), entry("MCT", MANUFACTURING),
            entry("품질 관리", QUALITY_MGMT), entry("QC", QUALITY_MGMT),

            entry("세포 배양", LAB_SKILLS), entry("단백질 정제", LAB_SKILLS),
            entry("밸리데이션", QUALITY_CONTROL), entry("신약 개발", BIO_AI),

            entry("BIM", BIM), entry("SketchUp", CAD_ARCH),
            entry("건축 설계", CAD_ARCH), entry("적산", STRUCTURAL_DESIGN),
            entry("소방법", REGULATION_COMPLY), entry("건축법", REGULATION_COMPLY),

            entry("MRO", MRO_KNOWLEDGE), entry("비파괴검사", NDT),
            entry("NDT", NDT), entry("항공 정비", MRO_KNOWLEDGE),
            entry("객실 서비스", CABIN_SERVICE), entry("CRS", AVIATION_MGMT),

            entry("퍼포먼스 마케팅", DIGITAL_MARKETING), entry("구글 애널리틱스", DIGITAL_MARKETING),
            entry("SEO", DIGITAL_MARKETING), entry("ERP", ERP_CRM),
            entry("CRM", ERP_CRM), entry("전략 기획", STRATEGY_PLANNING),
            entry("핀테크", FINTECH), entry("블록체인", FINTECH),
            entry("KPI", KPI_RESULT), entry("성과 지표", KPI_RESULT),
            entry("보고서", DOCUMENTATION), entry("문서화", DOCUMENTATION),

            entry("Git", SOFT_COLLABORATION), entry("협업", SOFT_COLLABORATION),
            entry("Agile", SOFT_COLLABORATION), entry("Jira", SOFT_COLLABORATION),
            entry("팀 프로젝트", SOFT_COLLABORATION),
            entry("트러블슈팅", SOFT_PROBLEM_SOLVING), entry("불량 분석", SOFT_PROBLEM_SOLVING),
            entry("문제 해결", SOFT_PROBLEM_SOLVING), entry("오류 분석", SOFT_PROBLEM_SOLVING),
            entry("수율 개선", SOFT_PROBLEM_SOLVING), entry("공정 최적화", PROCESS_OPT)
    );
}