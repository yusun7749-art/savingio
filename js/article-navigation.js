(() => {
  const explorer = document.querySelector('[data-site-explorer]');
  const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
  const sections = tocLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  const rightRailData = {
    'earned-income-credit-status-check': {
      action: [['심사 진행 상태 확인', '#status'], ['지급 결과 확인', '#result'], ['이의신청 준비', '#appeal']],
      calculator: [['근로소득 환급 예상 계산', '/calculators/'], ['연소득 확인 계산', '/calculators/']],
      related: [['숨은 환급금 한 번에 찾기', '/articles/check-hidden-refunds'], ['건강보험료 과오납 환급', '/articles/health-insurance-overpayment-refund']],
      schedule: ['정기 신청: 매년 5월', '반기 신청: 상·하반기 일정 확인', '기한 후 신청: 공식 공고 확인'],
      checklist: ['본인인증 수단 준비', '신청 귀속연도 확인', '계좌와 연락처 확인'],
      notice: [['국세청 공식 안내 확인', 'https://www.nts.go.kr/'], ['홈택스에서 직접 조회', 'https://www.hometax.go.kr/']]
    },
    'check-hidden-refunds': {
      action: [['정부 환급 항목 확인', '#check'], ['기관별 조회 순서', '#steps'], ['사기 문자 구별', '#fraud']],
      calculator: [['환급금 합계 계산', '/calculators/'], ['미수령 금액 정리', '/calculators/']],
      related: [['근로장려금 진행 상태 확인', '/articles/earned-income-credit-status-check'], ['건강보험료 과오납 환급', '/articles/health-insurance-overpayment-refund']],
      schedule: ['세금 환급: 신고·정산 일정 이후', '보험료 환급: 자격·부과 정정 이후', '지원금: 제도별 공고 기간 확인'],
      checklist: ['공식 사이트에 직접 접속', '본인 명의 계좌 확인', '신청 화면과 접수번호 저장'],
      notice: [['정부24 공식 안내', 'https://www.gov.kr/'], ['홈택스 공식 조회', 'https://www.hometax.go.kr/']]
    },
    'car-insurance-child-discount': {
      action: [['자녀 할인 대상 확인', '#check'], ['보험사 제출서류 확인', '#documents'], ['계약 변경 신청', '#steps']],
      calculator: [['자동차보험 절감액 계산', '/calculators/'], ['연간 보험료 비교', '/calculators/']],
      related: [['주행거리 환급 확인', '/articles/car-insurance-mileage-refund.html'], ['보험료 자동이체 할인', '/articles/insurance-auto-pay-discount.html']],
      schedule: ['가입·갱신 전 특약 확인', '출생·임신 확인 후 즉시 변경', '보험 만기 전 갱신 조건 재확인'],
      checklist: ['자녀 나이 기준 확인', '가족관계 증빙 준비', '변경 후 보험료 재산출 확인'],
      notice: [['금융감독원 보험 안내', 'https://www.fss.or.kr/'], ['보험다모아 비교', 'https://e-insmarket.or.kr/']]
    },
    'car-insurance-mileage-refund': {
      action: [['주행거리 등록', '#steps'], ['계기판 사진 준비', '#photo'], ['환급 결과 확인', '#refund']],
      calculator: [['주행거리 환급 예상 계산', '/calculators/'], ['연간 차량비 계산', '/calculators/']],
      related: [['자녀 할인 특약 확인', '/articles/car-insurance-child-discount.html'], ['자동차세 연납 할인', '/articles/car-tax-annual-payment.html']],
      schedule: ['가입 시 최초 주행거리 등록', '만기 전 최종 주행거리 제출', '환급 완료일까지 접수 상태 확인'],
      checklist: ['계기판 전체가 보이는 사진', '촬영일과 제출기한 확인', '환급 계좌·카드 확인'],
      notice: [['보험사 공식 앱에서 제출', '#steps'], ['금융감독원 보험 안내', 'https://www.fss.or.kr/']]
    },
    'car-tax-annual-payment': {
      action: [['연납 신청 방법', '#steps'], ['할인 적용 확인', '#discount'], ['납부 결과 확인', '#check']],
      calculator: [['자동차세 예상액 계산', '/calculators/'], ['연납 절감액 계산', '/calculators/']],
      related: [['자동차세 조회·납부 안내', '/articles/car-tax-check-payment-guide.html'], ['주행거리 보험 환급', '/articles/car-insurance-mileage-refund.html']],
      schedule: ['1월 연납 신청 기간 확인', '미신청 시 분기별 추가 기간 확인', '납부기한 마지막 날 혼잡 주의'],
      checklist: ['차량번호와 소유자 확인', '할인 반영 금액 확인', '납부 영수증 저장'],
      notice: [['위택스 공식 안내', 'https://www.wetax.go.kr/'], ['지방세 납부 일정 확인', 'https://www.wetax.go.kr/']]
    },
    'car-tax-check-payment-guide': {
      action: [['자동차세 조회', '#lookup'], ['납부 방법 선택', '#payment'], ['미납 여부 확인', '#check']],
      calculator: [['자동차세 예상액 계산', '/calculators/'], ['연납 절감액 계산', '/calculators/']],
      related: [['자동차세 연납 신청', '/articles/car-tax-annual-payment.html'], ['사업용 차량 비용 처리', '/articles/business-vehicle-expense-basics.html']],
      schedule: ['정기분 납부월 확인', '연납 신청 기간 확인', '체납 전 납부 결과 재확인'],
      checklist: ['차량 소유자 정보 확인', '과세기간 확인', '전자납부번호와 영수증 저장'],
      notice: [['위택스 자동차세 조회', 'https://www.wetax.go.kr/'], ['지방세 공식 공지 확인', 'https://www.wetax.go.kr/']]
    },
    'business-vehicle-expense-basics': {
      action: [['비용 인정 기준 확인', '#basics'], ['운행기록 준비', '#records'], ['증빙 정리', '#check']],
      calculator: [['사업용 차량비 계산', '/calculators/'], ['월별 경비 합계 계산', '/calculators/']],
      related: [['자동차세 조회·납부', '/articles/car-tax-check-payment-guide.html'], ['자동차세 연납 할인', '/articles/car-tax-annual-payment.html']],
      schedule: ['매월 증빙 즉시 정리', '부가세·종소세 신고 전 검토', '차량 변경 시 업무용 등록 확인'],
      checklist: ['업무·개인 사용 구분', '카드·세금계산서 보관', '운행기록부 작성 여부 확인'],
      notice: [['국세청 공식 세무 안내', 'https://www.nts.go.kr/'], ['홈택스 신고 자료 확인', 'https://www.hometax.go.kr/']]
    },
    'duplicate-indemnity-insurance-check': {
      action: [['중복 가입 조회', '#lookup'], ['보장 내용 비교', '#compare'], ['해지 전 확인', '#check']],
      calculator: [['보험료 합계 계산', '/calculators/'], ['연간 고정비 계산', '/calculators/']],
      related: [['보험료 자동이체 할인', '/articles/insurance-auto-pay-discount.html'], ['건강보험료 과오납 환급', '/articles/health-insurance-overpayment-refund']],
      schedule: ['신규 가입 전 중복 확인', '갱신 전 보장 비교', '해지 전 보장 공백 점검'],
      checklist: ['계약자·피보험자 구분', '실손 가입 시기 확인', '해지환급금과 면책기간 확인'],
      notice: [['내보험찾아줌 공식 조회', 'https://cont.insure.or.kr/'], ['금융감독원 보험 안내', 'https://www.fss.or.kr/']]
    },
    'insurance-auto-pay-discount': {
      action: [['자동이체 할인 확인', '#discount'], ['결제수단 변경', '#steps'], ['출금 실패 예방', '#check']],
      calculator: [['보험료 할인액 계산', '/calculators/'], ['연간 보험료 합계 계산', '/calculators/']],
      related: [['실손보험 중복가입 확인', '/articles/duplicate-indemnity-insurance-check.html'], ['건강보험료 과오납 환급', '/articles/health-insurance-overpayment-refund']],
      schedule: ['보험료 출금일 전 잔액 확인', '카드 만료 전 결제수단 변경', '갱신 시 할인 조건 재확인'],
      checklist: ['할인 적용 여부 확인', '출금 계좌 명의 확인', '미납·실효 여부 점검'],
      notice: [['보험사 공식 앱에서 변경', '#steps'], ['금융감독원 보험 안내', 'https://www.fss.or.kr/']]
    },
    'health-insurance-overpayment-refund': {
      action: [['환급금 조회', '#lookup'], ['월별 내역 비교', '#compare'], ['신청 순서 확인', '#steps']],
      calculator: [['과오납 금액 합계 계산', '/calculators/'], ['월별 보험료 비교', '/calculators/']],
      related: [['숨은 환급금 찾기', '/articles/check-hidden-refunds'], ['근로장려금 진행 상태', '/articles/earned-income-credit-status-check']],
      schedule: ['자격변동 처리 후 재조회', '환급 신청 후 접수 상태 확인', '실제 입금 후 내역 대조'],
      checklist: ['최근 6~12개월 납부내역', '자격득실확인서', '본인 명의 환급 계좌'],
      notice: [['국민건강보험 공식 조회', 'https://www.nhis.or.kr/'], ['정부24 공식 안내', 'https://www.gov.kr/']]
    }
  };

  const railSection = (title, items, linked = true) => {
    const body = linked
      ? items.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')
      : `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
    return `<section class="rail-section"><h2>${title}</h2>${body}</section>`;
  };

  function renderRightRail() {
    const rail = document.querySelector('.right-rail');
    if (!rail) return;
    const slug = location.pathname.replace(/\/$/, '').split('/').pop().replace(/\.html$/, '');
    const data = rightRailData[slug];
    if (!data) return;

    rail.innerHTML = [
      railSection('지금 해야 할 일', data.action),
      railSection('관련 계산기', data.calculator),
      railSection('관련 글', data.related),
      railSection('신청 일정', data.schedule, false),
      railSection('체크리스트', data.checklist, false),
      railSection('최신 공지', data.notice)
    ].join('');
  }

  async function renderExplorer() {
    if (!explorer) return;
    try {
      const response = await fetch('/data/site-navigation.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('navigation load failed');
      const tree = await response.json();
      const current = location.pathname;
      explorer.innerHTML = Object.entries(tree).map(([large, middleGroups], largeIndex) => {
        const containsCurrent = Object.values(middleGroups).flat().some(([, url]) => url === current);
        return `<details class="explorer-large" ${(containsCurrent || largeIndex === 0) ? 'open' : ''}>
          <summary>${large}</summary>
          ${Object.entries(middleGroups).map(([middle, items]) => `
            <div class="explorer-middle">
              <strong>${middle}</strong>
              <ul>${items.map(([label, url]) => `<li><a href="${url}" ${url === current ? 'aria-current="page" class="is-current"' : ''}>${label}</a></li>`).join('')}</ul>
            </div>`).join('')}
        </details>`;
      }).join('');
    } catch (error) {
      explorer.innerHTML = '<p class="explorer-error">탐색 메뉴를 불러오지 못했습니다.</p>';
    }
  }

  function updateActiveToc() {
    if (!sections.length) return;
    const marker = window.scrollY + 150;
    let active = sections[0];
    sections.forEach(section => { if (section.offsetTop <= marker) active = section; });
    tocLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${active.id}`;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else link.removeAttribute('aria-current');
    });
  }

  document.querySelectorAll('[data-explorer-toggle]').forEach(button => button.addEventListener('click', () => document.body.classList.toggle('explorer-open')));
  document.querySelectorAll('[data-explorer-close]').forEach(button => button.addEventListener('click', () => document.body.classList.remove('explorer-open')));
  window.addEventListener('scroll', updateActiveToc, {passive: true});
  renderRightRail();
  renderExplorer();
  updateActiveToc();
})();