import { useState } from "react";
import { Link } from "react-router-dom";
import CareerPilotHelmIcon from '../components/CareerPilotHelmIcon';

const SECTIONS = [
  { id: "terms", label: "이용약관" },
  { id: "privacy", label: "개인정보처리방침" },
  { id: "withdrawal", label: "탈퇴 및 데이터 처리" },
];

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Article({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function TermsPage() {
  const [active, setActive] = useState("terms");

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* 헤더 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)]">
            <CareerPilotHelmIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">이용약관 및 개인정보처리방침</h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
            <p className="text-xs text-[#6366f1] font-medium">본 서비스는 현재 베타 운영 중입니다</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                active === s.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 이용약관 */}
        {active === "terms" && (
          <div className="space-y-8">
            <Section title="1. 이용약관">
              <Article title="제1조 (목적)">
                <p>본 약관은 CareerPilot(이하 "서비스")가 제공하는 AI 기반 취업 역량 분석 및 준비 지원 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
              </Article>

              <Article title="제2조 (정의)">
                <p>1. "서비스"란 AI 기술을 기반으로 이용자의 경험과 역량을 분석하고, 직무 매칭, 자기소개서 작성, 심층 인터뷰, 모의면접 등 취업 준비를 지원하는 플랫폼을 의미합니다.</p>
                <p>2. "이용자"란 본 약관에 동의하고 서비스를 이용하는 모든 사용자를 의미합니다.</p>
                <p>3. "콘텐츠"란 이용자가 입력한 텍스트(경험, 자기소개서 등) 및 서비스가 생성한 분석 결과를 의미합니다.</p>
                <p>4. "크레딧"이란 서비스 내 유료 기능 이용을 위해 충전하여 사용하는 가상 화폐를 의미합니다.</p>
              </Article>

              <Article title="제3조 (약관의 효력 및 변경)">
                <p>1. 본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</p>
                <p>2. 서비스는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다.</p>
                <p>3. 변경된 약관은 서비스 내 공지 후 적용되며, 이용자가 계속 서비스를 이용할 경우 동의한 것으로 간주합니다.</p>
              </Article>

              <Article title="제4조 (서비스의 제공)">
                <p>서비스는 다음 기능을 제공합니다:</p>
                <p>1. AI 기반 역량 분석 및 직무 매칭</p>
                <p>2. 심층 인터뷰를 통한 역량 수준 평가 (L1~L4)</p>
                <p>3. 채용공고(JD) 분석 및 역량 갭 분석</p>
                <p>4. AI 자기소개서 작성 지원</p>
                <p>5. AI 모의면접 연습</p>
                <p>6. 역량 향상 로드맵 제공</p>
                <p className="pt-1">서비스는 운영상 필요에 따라 기능을 변경, 추가 또는 중단할 수 있습니다.</p>
              </Article>

              <Article title="제5조 (크레딧 정책)">
                <p>1. 서비스 내 일부 기능은 크레딧을 소모합니다:</p>
                <div className="ml-4 space-y-0.5">
                  <p>• 심층 인터뷰: 3 크레딧</p>
                  <p>• JD 분석: 1 크레딧</p>
                  <p>• 역량 로드맵 생성: 1 크레딧</p>
                  <p>• 자소서 생성: 2 크레딧</p>
                  <p>• 자소서 평가: 1 크레딧</p>
                  <p>• 모의면접: 2 크레딧</p>
                </div>
                <p>2. 크레딧은 서비스 내 결제 수단을 통해 충전할 수 있습니다.</p>
                <p>3. 충전된 크레딧은 원칙적으로 환불되지 않습니다. 단, 서비스 오류로 인해 크레딧이 부당하게 차감된 경우 운영자에게 문의하면 복구를 검토합니다.</p>
                <p>4. 서비스 종료 시 잔여 크레딧 처리 방침은 별도 공지합니다.</p>
              </Article>

              <Article title="제6조 (서비스 이용 제한)">
                <p>서비스는 다음과 같은 경우 이용을 제한할 수 있습니다:</p>
                <p>1. 서비스 운영 방해 행위</p>
                <p>2. 프롬프트 공격 및 시스템 악용</p>
                <p>3. 타인 정보 도용</p>
                <p>4. 법령 위반 행위</p>
              </Article>

              <Article title="제7조 (이용자의 의무)">
                <p>이용자는 다음 행위를 해서는 안 됩니다:</p>
                <p>• 허위 정보 입력</p>
                <p>• 시스템 악용 및 비정상적 요청</p>
                <p>• 서비스 결과의 부정한 왜곡 또는 오용</p>
              </Article>

              <Article title="제8조 (AI 기반 서비스의 한계 및 책임 제한)">
                <p>1. 서비스는 AI를 기반으로 결과를 생성하며, 해당 결과는 통계적·확률적 방식에 의해 도출되므로 사실과 다르거나 부정확할 수 있습니다.</p>
                <p>2. 서비스가 제공하는 모든 정보는 취업 준비를 돕기 위한 참고 자료이며, 합격 또는 취업을 보장하지 않습니다.</p>
                <p>3. 이용자는 서비스 결과를 참고하여 스스로 판단하고 결정해야 하며, 그 결과에 대한 책임은 이용자에게 있습니다.</p>
                <p>4. 서비스는 분석 결과의 정확성·완전성, 특정 기업·직무에 대한 합격 가능성, 동일 입력에 대한 결과의 일관성에 대해 어떠한 보증도 하지 않습니다.</p>
                <p>5. 취업 실패 또는 기회 상실, 의사결정 오류, 이용자 입력 오류로 인해 발생한 손해에 대해 책임을 지지 않습니다.</p>
                <p>6. 서비스는 기능, 알고리즘, 평가 기준을 변경할 수 있으며, 이에 따른 결과 차이에 대해 책임을 지지 않습니다.</p>
              </Article>

              <Article title="제9조 (콘텐츠 권리)">
                <p>1. 이용자가 입력한 데이터(경험, 자기소개서 등)의 권리는 이용자에게 있습니다.</p>
                <p>2. 서비스는 운영 및 품질 개선을 위해 해당 데이터를 비독점적으로 활용할 수 있습니다.</p>
                <p>3. 서비스가 생성한 분석 결과물은 이용자가 자유롭게 활용할 수 있습니다. 서비스는 해당 결과물에 대한 독점적 권리를 주장하지 않습니다.</p>
              </Article>

              <Article title="제10조 (데이터의 수집 및 활용)">
                <p>1. 서비스는 역량 평가 결과, JD 분석 결과, 자기소개서 및 입력 텍스트, 모의면접 응답 데이터를 수집 및 활용할 수 있습니다.</p>
                <p>2. 활용 목적: AI 모델 성능 개선, 서비스 품질 향상, 분석 및 추천 정확도 개선</p>
                <p>3. 데이터는 개인 식별이 불가능하도록 익명화 또는 비식별 처리 후 활용됩니다.</p>
                <p>4. 해당 데이터는 외부에 공개하거나 제3자에게 제공하지 않습니다. 단, 법령에 따른 경우는 예외로 합니다.</p>
                <p>5. 이용자는 데이터 활용 거부를 운영자에게 요청할 수 있습니다.</p>
              </Article>

              <Article title="제11조 (서비스 중단)">
                <p>서비스는 점검, 장애, 운영상 사유 등으로 일시 중단될 수 있으며, 가능한 경우 사전 공지합니다.</p>
              </Article>

              <Article title="제12조 (분쟁 해결)">
                <p>본 약관과 관련된 분쟁은 관련 법령에 따르며, 서비스 운영자의 소재지를 관할하는 법원을 관할 법원으로 합니다.</p>
              </Article>
            </Section>
          </div>
        )}

        {/* 개인정보처리방침 */}
        {active === "privacy" && (
          <div className="space-y-8">
            <Section title="2. 개인정보처리방침">
              <Article title="제1조 (처리 목적)">
                <p>서비스는 다음 목적을 위해 개인정보를 처리합니다:</p>
                <p>1. 회원 가입 및 관리</p>
                <p>2. 서비스 제공 및 기능 운영</p>
                <p>3. 고객 문의 대응</p>
              </Article>

              <Article title="제2조 (수집 항목)">
                <p className="font-medium text-foreground">개인정보</p>
                <p>• 이메일</p>
                <p>• 비밀번호 (암호화 저장)</p>
                <p>• 닉네임</p>
                <p className="font-medium text-foreground pt-1">이용자 생성 데이터 (비개인정보)</p>
                <p>• 역량 평가 결과</p>
                <p>• JD 분석 결과</p>
                <p>• 자기소개서</p>
                <p>• 모의면접 응답</p>
                <p>• 크레딧 충전 및 사용 내역</p>
              </Article>

              <Article title="제3조 (보유 및 이용 기간)">
                <p>수집 목적 달성 후 지체 없이 삭제합니다. 단, 법령에 따라 일정 기간 보관이 필요한 경우 예외로 합니다.</p>
              </Article>

              <Article title="제4조 (제3자 제공)">
                <p>개인정보는 외부에 제공하지 않습니다. 단, 법령에 따른 경우는 예외로 합니다.</p>
              </Article>

              <Article title="제5조 (처리 위탁)">
                <p>서비스는 다음 업체에 일부 처리를 위탁합니다:</p>
                <div className="mt-2 rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-foreground">수탁 업체</th>
                        <th className="px-4 py-2.5 text-left font-medium text-foreground">위탁 업무</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="px-4 py-2.5">OpenAI (미국)</td>
                        <td className="px-4 py-2.5">AI 분석 및 생성 처리</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-4 py-2.5">PortOne (포트원)</td>
                        <td className="px-4 py-2.5">결제 처리</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="pt-1">위탁 업체는 관련 법령에 따라 관리되며, 위탁 목적 외 용도로 개인정보를 활용하지 않습니다.</p>
              </Article>

              <Article title="제6조 (이용자 생성 데이터 활용)">
                <p>1. 역량 평가 결과, JD 분석 결과, 자기소개서, 모의면접 응답을 서비스 개선 목적으로 활용할 수 있습니다.</p>
                <p>2. 활용 목적: AI 모델 개선, 서비스 품질 향상, 추천 정확도 향상</p>
                <p>3. 해당 데이터는 개인정보를 제거하거나 비식별화 처리 후 활용됩니다.</p>
                <p>4. 외부에 제공하지 않습니다.</p>
              </Article>

              <Article title="제7조 (이용자 권리)">
                <p>이용자는 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다. 요청은 서비스 내 문의 또는 아래 책임자 연락처를 통해 가능합니다.</p>
              </Article>

              <Article title="제8조 (안전성 확보 조치)">
                <p>• 비밀번호 암호화 저장 (BCrypt)</p>
                <p>• JWT 기반 인증 및 접근 권한 관리</p>
                <p>• HTTPS 통신 암호화</p>
              </Article>

              <Article title="제9조 (개인정보 보호책임자)">
                <p>개인정보 보호와 관련한 문의는 아래로 연락해 주세요.</p>
                <p>• 책임자: 서비스 운영자</p>
                <p>• 이메일: CareerPilot.dev@gmail.com</p>
              </Article>

              <Article title="제10조 (정책 변경)">
                <p>개인정보처리방침이 변경될 경우 서비스 내 공지를 통해 안내합니다.</p>
              </Article>
            </Section>
          </div>
        )}

        {/* 탈퇴 및 데이터 처리 */}
        {active === "withdrawal" && (
          <div className="space-y-8">
            <Section title="3. 탈퇴 및 데이터 처리 정책">
              <Article title="제11조 (회원 탈퇴 시 처리)">
                <p>1. 탈퇴 시 다음 개인정보는 즉시 삭제됩니다:</p>
                <div className="ml-4">
                  <p>• 이메일</p>
                  <p>• 비밀번호</p>
                  <p>• 닉네임</p>
                </div>
                <p>2. 다음 데이터는 개인정보와 분리 후 비식별화하여 보관될 수 있습니다:</p>
                <div className="ml-4">
                  <p>• 역량 평가 결과</p>
                  <p>• JD 분석 결과</p>
                  <p>• 자기소개서</p>
                  <p>• 모의면접 응답</p>
                </div>
                <p>3. 보관 목적: AI 모델 개선, 서비스 품질 향상</p>
                <p>4. 이용자는 탈퇴 시 모든 데이터의 완전 삭제를 요청할 수 있으며, 이 경우 복구 불가능하게 삭제됩니다.</p>
                <p>5. 법령에 따라 일부 데이터(결제 내역 등)는 일정 기간 보관될 수 있습니다.</p>
              </Article>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">탈퇴 시 선택 옵션</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• <span className="font-medium text-foreground">계정만 삭제</span>: 개인정보 삭제, 생성 데이터는 비식별화 후 보관</p>
                  <p>• <span className="font-medium text-foreground">전체 데이터 완전 삭제</span>: 모든 데이터 즉시 삭제 (복구 불가)</p>
                </div>
              </div>
            </Section>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                📌 본 서비스는 취업 준비를 지원하는 도구로서, 합격을 보장하거나 전문적인 취업 컨설팅을 대체하지 않습니다. 모든 분석 결과는 참고 자료로 활용하시기 바랍니다.
              </p>
            </div>
          </div>
        )}

        {/* 하단 링크 */}
        <div className="text-center pt-4 border-t border-border">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 로그인으로 돌아가기
          </Link>
        </div>

      </div>
    </div>
  );
}

export default TermsPage;