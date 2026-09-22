/* 직무별 프리셋 (?role=engine / ?role=ta)
 *
 * index.html 과 _layouts/page.html 에서 공통으로 불러옵니다.
 *   1. 헤드라인 / 프로젝트 순서 전환 (index 에서만 동작)
 *   2. sessionStorage 로 탭 내 이동 간 프리셋 유지
 *   3. 내부 링크에 ?role= 을 자동으로 부착해 주소창과 상태를 일치시킴
 *
 * 직무를 추가하려면 ROLES 에 항목 하나만 추가하면 됩니다.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pf-role';

  // WebGL 빌드는 별도 앱이므로 링크 재작성에서 제외
  var EXCLUDE_PATH = /\/projects\/roll-into-dungeon-play\//;

  var ROLES = {
    client: {
      role:  'Game Client Developer',
      title: '김진선 | Game Client Developer',
      order: ['project-bbb', 'cyberz', 'roll-into-dungeon', 'tank-shoot']
    },
    engine: {
      role:  'Game Engine / Graphics Programmer',
      title: '김진선 | Game Engine / Graphics Programmer',
      order: ['cyberz', 'project-bbb', 'roll-into-dungeon', 'tank-shoot']
    },
    ta: {
      role:  'Technical Artist / Graphics Programmer',
      title: '김진선 | Technical Artist / Graphics Programmer',
      order: ['cyberz', 'project-bbb', 'roll-into-dungeon', 'tank-shoot']
    }
  };

  // ── 1. 적용할 프리셋 결정 : 쿼리 파라미터 > 세션에 기억된 값 ──
  function resolveKey() {
    var fromQuery = new URLSearchParams(location.search).get('role');
    if (fromQuery) return fromQuery.toLowerCase();    // 명시된 값이 항상 우선
    try {
      return (sessionStorage.getItem(STORAGE_KEY) || '').toLowerCase();
    } catch (e) {
      return '';                                      // 스토리지 차단 환경
    }
  }

  var key    = resolveKey();
  var preset = ROLES[key];

  if (!preset) {
    // 알 수 없는 값이면 기본 상태로 되돌린다 (?role=xxx 로 초기화 가능)
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    return;
  }
  try { sessionStorage.setItem(STORAGE_KEY, key); } catch (e) {}

  // ── 2. 헤드라인 교체 (index 전용) ──
  var roleEl = document.querySelector('.hero-role');
  if (roleEl) {
    roleEl.textContent = preset.role;
    document.title     = preset.title;
  }

  // ── 3. 프로젝트 순서 재배치 (요약 목록 + 상세 카드) ──
  function reorder(containerSel, itemSel, idOf) {
    var box = document.querySelector(containerSel);
    if (!box) return;
    var byId = {};
    Array.prototype.forEach.call(box.querySelectorAll(itemSel), function (el) {
      byId[idOf(el)] = el;
    });
    preset.order.forEach(function (id) {
      if (byId[id]) box.appendChild(byId[id]);   // 목록에 없는 항목은 원래 순서로 뒤에 유지
    });
  }

  reorder('.proj-exp-list', '.proj-exp-item', function (el) {
    return (el.getAttribute('href') || '').replace('#', '');
  });
  reorder('.projects-list', '.card', function (el) { return el.id; });

  // ── 4. 내부 링크에 ?role= 부착 (상세보기 ↔ 목록으로 이동 시 유지) ──
  Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return;        // 순수 앵커 : 페이지 내 스크롤 유지

    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return; }

    if (url.origin !== location.origin) return;       // 외부 링크 / mailto / tel
    if (EXCLUDE_PATH.test(url.pathname)) return;      // WebGL 빌드

    url.searchParams.set('role', key);
    a.setAttribute('href', url.href);
  });
})();
