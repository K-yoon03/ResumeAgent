// 3. CapabilityCode.java
package com.kyoon.resumeagent.Capability;

public enum CapabilityCode {
    BE_LANG("백엔드 프로그래밍 언어"),
    BE_FRAMEWORK("백엔드 프레임워크 활용"),
    DB_USAGE("데이터베이스 기본 활용 및 SQL 작성"),
    DB_ARCH("데이터베이스 모델링 및 성능 최적화"),
    API_USAGE("REST API 등 외부 연동 및 활용"),
    API_ARCH("MSA 및 API 아키텍처 설계"),
    CS_FUNDAMENTAL("자료구조, 알고리즘 등 CS 기초 지식"),

    FE_LANG("프론트엔드 프로그래밍 언어"),
    FE_FRAMEWORK("프론트엔드 프레임워크 활용"),

    PYTHON("Python 프로그래밍 언어"),
    ML_FRAMEWORK("머신러닝/딥러닝 프레임워크 활용"),
    DATA_PROCESSING("데이터 전처리 및 분석"),
    DATA_VIZ("데이터 시각화"),
    ML_MODELING("머신러닝 및 딥러닝 모델 설계"),
    MATH_STATS("통계학 및 수학적 지식"),

    C_CPP("C/C++ 프로그래밍 언어"),
    LINUX("Linux OS 환경 활용 및 쉘 스크립트"),
    EMBEDDED("임베디드 시스템 및 펌웨어 개발"),
    ROS("ROS 기반 로봇 소프트웨어 개발"),
    NETWORK_PROTOCOL("네트워크 통신 프로토콜 이해 및 활용"),
    SENSOR_CONTROL("센서 및 모터 제어"),

    UNITY("Unity 엔진 활용"),
    UNREAL("Unreal 엔진 활용"),
    CSHARP("C# 프로그래밍 언어"),
    CPP_GAME("게임 개발용 C++ 및 블루프린트 활용"),
    VR_AR("VR/AR 및 메타버스 콘텐츠 개발"),
    THREE_D_MODELING("3D 모델링 및 그래픽 에셋 제작"),
    GAME_DESIGN("게임 기획 및 시스템 설계"),

    GIS("GIS 및 공간 데이터 처리"),
    DIGITAL_TWIN("디지털 트윈 구축 및 활용"),
    SPATIAL_PYTHON("공간 데이터 분석용 Python 활용"),
    THREE_D_DATA("3D 포인트 클라우드 및 스페이셜 데이터 처리"),

    NETWORK("네트워크 아키텍처 및 인프라 구축"),
    WEB_SECURITY("웹 취약점 점검 및 모의해킹"),
    SYSTEM_SECURITY("시스템 보안 및 악성코드 분석"),
    CLOUD_USAGE("클라우드 서비스 활용 (AWS, GCP 등)"),
    CLOUD_ARCH("클라우드 네이티브 아키텍처 설계"),
    LINUX_SERVER("Linux 서버 운영 및 관리"),
    CONTAINER("도커 및 쿠버네티스 컨테이너 운영"),
    CRYPTO("암호학 및 PKI 기반 보안"),

    PLC_HMI("PLC 제어 및 HMI 작화"),
    EMBEDDED_FW("임베디드 펌웨어 및 RTOS 개발"),
    CIRCUIT_DESIGN("전자회로 및 PCB 설계"),
    VERILOG("Verilog 및 FPGA 설계"),
    SECS_GEM("반도체 장비 통신 표준 (SECS/GEM)"),

    PROCESS_KNOWLEDGE("반도체 8대 공정 지식"),
    DEFECT_ANALYSIS("불량 원인 분석 및 개선"),
    CLEANROOM("클린룸 환경 및 안전 관리"),
    EQUIPMENT_MAINT("반도체 장비 유지보수 (PM)"),
    SOP_COMPLIANCE("SOP 준수 및 표준 작업 수행"),

    PLC_CONTROL("산업용 로봇 및 PLC 제어"),
    ROBOT_CONTROL("산업용 로봇 티칭 및 제어"),
    HMI_SCADA("SCADA 시스템 및 HMI 구축"),
    PROCESS_OPT("생산 공정 최적화 및 수율 개선"),
    ELECTRICAL_SYSTEM("전장 시스템 및 제어반 설계"),
    RENEWABLE_ENERGY("신재생 에너지 시스템 이해"),

    CAD_USAGE("2D/3D CAD 도구 활용"),
    MECH_DESIGN("기구 설계 및 도면 작성"),
    MECH_ANALYSIS("CAE 기반 구조 및 유동 해석"),
    MANUFACTURING("CNC/MCT 등 기계 가공"),
    QUALITY_MGMT("품질 관리 및 QC 지표 분석"),

    LAB_SKILLS("세포 배양 및 단백질 정제 등 실험 기법"),
    QUALITY_CONTROL("바이오 의약품 품질 관리 및 밸리데이션"),
    BIO_AI("AI 기반 신약 개발 알고리즘"),
    DATA_ANALYSIS_BIO("바이오 인포매틱스 및 데이터 분석"),
    GMP_COMPLIANCE("GMP 규정 및 품질 보증"),

    CAD_ARCH("건축 설계 및 3D 모델링 도구 활용"),
    DESIGN_INTENT("건축 설계 의도 도출 및 공간 기획"),
    REGULATION_COMPLY("건축법 및 소방법 등 규제 준수"),
    BIM("BIM (건축 정보 모델링) 구축"),
    STRUCTURAL_DESIGN("건축 구조 설계 및 적산"),

    MRO_KNOWLEDGE("항공 정비 (MRO) 지식"),
    NDT("비파괴 검사 (NDT) 수행"),
    CABIN_SERVICE("항공 객실 서비스 및 승객 안전 관리"),
    AVIATION_MGMT("항공 운항 관리 및 CRS 시스템 활용"),

    KPI_RESULT("핵심 성과 지표 (KPI) 수립 및 달성"),
    DATA_DRIVEN("데이터 기반 의사결정 및 지표 분석"),
    STRATEGY_PLANNING("신사업 기획 및 비즈니스 전략 수립"),
    DIGITAL_MARKETING("퍼포먼스 마케팅 및 SEO 최적화"),
    ERP_CRM("ERP 및 CRM 시스템 운영"),
    FINTECH("핀테크 및 블록체인 비즈니스 이해"),
    DOCUMENTATION("보고서 작성 및 기술 문서화"),

    PORTFOLIO_LINK("포트폴리오 완성도 및 링크 제공"),
    TOOL_PROFICIENCY("디자인 및 업무 툴 숙련도"),
    CERT_DESIGN("디자인 관련 자격증 보유"),

    CERT_MATCH("직무 관련 공인 자격증 보유"),
    LANGUAGE_SCORE("공인 어학 점수 (TOEIC, OPIc 등)"),
    WORK_EXPERIENCE("유관 업무 및 실무 경력"),

    SOFT_COLLABORATION("팀 프로젝트 및 협업 커뮤니케이션"),
    SOFT_PROBLEM_SOLVING("트러블슈팅 및 논리적 문제 해결");

    private final String description;

    CapabilityCode(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}