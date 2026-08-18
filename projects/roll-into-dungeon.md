---
layout: page
title: Roll Into Dungeon
permalink: /projects/roll-into-dungeon/
---

> Unity(WebGL) 기반 주사위 턴제 RPG | AI 바이브 코딩 해커톤(2026 NHN) 출품작

<div class="card-links">
  <a class="btn btn-primary" href="/projects/roll-into-dungeon-play/" target="_blank">🎮 플레이하기</a>
  <a class="btn" href="https://github.com/KimJinsun610/2026NHN_Hackathon" target="_blank">GitHub</a>
  <a class="btn" href="https://youtu.be/4GJdbWePcOM" target="_blank">YouTube</a>
</div>

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C# |
| 개발 환경 | Unity 6, WebGL |
| 개발 인원 | 2명 |
| 개발 기간 | 2026.07.20 ~ 2026.08.06 |
| 담당 역할 | 전투 로직을 제외한 전체 시스템 |

"AI 바이브 코딩을 통한 빠른 게임 개발과 응용"을 목표 삼아 제작한 NHN 해커톤 사전과제 출품작입니다. Claude Code를 페어 프로그래머로 활용해 짧은 기간 안에 빠르게 프로토타이핑하고 개발하는 방식으로 진행했습니다. 팀원이 전투 시스템(BattleManager, 웨이브 기반 전투, 데미지 계산)을 맡았고, 저는 그 외 게임 전반 — 주사위 시스템, 로비씬, 사운드, 씬 전환 흐름 — 을 담당했습니다.

---

## 담당 구현 항목

**주사위 시스템**
- 물리 기반 주사위 굴리기 및 결과 판정, 굴러가는 도중엔 선택 불가하도록 상태 관리
- 클릭으로 주사위 선택/고정(Fix), `DiceManager`가 동시 고정 가능 개수를 중재
- 확정된 주사위의 공격/방어 합산 UI + 카운트업 연출, UI와 전투 시스템이 함께 참조하는 데이터 계약(`DiceTotals`) 설계
- "다시 굴리기" / "이대로 공격하기" 버튼 기반 턴 흐름, 라운드당 리롤 3회 제한
- 전 주사위가 동일한 눈금일 때 공격력/방어력 3배가 적용되는 강공격 판정
- 로비에서 장착한 주사위를 플레이씬 진입 시 실제로 스폰하는 `DiceSpawner` 구현

**로비씬**
- 소지 주사위 목록 UI (같은 종류 다중 소지 대응, 세로 스크롤, 선택 슬롯 강조 표시)
- 선택한 주사위 정보 패널 — 드래그로 회전 가능한 3D 프리뷰, 면별 공격/방어 이미지 표시
- 장착 주사위(3슬롯) UI — 보유 개수 제한 검증 포함
- 던전 적 정보창 — 처음엔 페이지 전환 방식으로 만들었다가, 소지 주사위 목록과 동일한 스크롤 리스트 선택 방식으로 재설계 (동일 적 중복 제거, 보스 뱃지, 3D 프리뷰)
- 장착 슬롯이 모두 채워져야 활성화되는 "다음 라운드 입장" 버튼 + 안내 문구

**사운드**
- 주사위 충돌 세기에 따라 볼륨/피치가 랜덤화되는 클랙 사운드 (`DiceAudio`)
- 버튼 클릭, 주사위 픽스 토글 사운드
- 씬 전환에도 끊기지 않는 배경음악 재생기(`BgmManager`), 씬별 곡 지정(`SceneBgmTrigger`)

**씬 전환 흐름**
- 시작 화면(클릭/키 입력 시 화면·BGM 페이드아웃) → 로딩 화면(최소 노출 시간 보장) → 로비 → 플레이로 이어지는 전환 구조 설계
- 다른 씬 전환 지점에서도 재사용 가능하도록 `SceneLoader`를 별도 정적 클래스로 분리

**협업**
- 팀원과 독립적으로 작업한 브랜치를 병합하며 발생한 Unity 씬/프리팹 3-way 충돌(총 3차례, 45개 이상)을 `UnityYAMLMerge`로 직접 해결
- Play 모드에서만 스프라이트가 안 보이던 버그를 원인 추적 후 수정 (에디터 작업 중 `TagManager.asset`의 Sorting/Rendering Layer가 리셋된 것이 원인)

---

## 설계 상 고려한 지점

- 주사위 개수 제한 검증은 개별 `Dice`가 아닌 여러 주사위를 동시에 볼 수 있는 `DiceManager`가 전담하도록 책임을 분리했습니다.
- UI가 표시하는 합산값과 전투 시스템이 받는 값이 어긋나지 않도록, 둘이 동일한 데이터(`DiceTotals`)를 구독하는 구조로 설계했습니다.
- 동시 고정 가능한 주사위 개수(`DiceManager.maxFixedCount`)와 장착 슬롯 개수(`EquippedDice.maxSlots`)를 모두 상수로 박아두지 않고 `[SerializeField]` 값으로 노출했습니다. "슬롯이 3개 이상으로 늘어날 수 있으니 확장성을 고려해달라"는 요청 이후 같은 패턴을 프로젝트 전반에 일관되게 적용해, 기획 값이 바뀌어도 코드 수정 없이 Inspector 값만 조정하면 대응할 수 있게 했습니다.
- `SceneLoader`를 특정 씬 전환에 묶어두지 않고 별도 정적 클래스로 분리해뒀는데, 실제로 이후 로비→플레이 전환에도 그대로 재사용되며 처음 설계한 의도(재사용 가능한 씬 전환 매개체)가 그대로 들어맞았습니다.
- 3D 프리뷰는 실제 플레이용 주사위/적 프리팹을 그대로 쓰지 않고, 물리·전투 로직이 없는 경량 프리뷰 전용 오브젝트(`previewPrefab`/`visualRoot`)만 분리해서 재사용했습니다. 프리뷰 카메라 레이어 강제 통일(`SetLayerRecursively`) 로직과 리스트 선택 강조 표시 패턴도 주사위 목록에서 먼저 만든 뒤 적 목록에 그대로 이식했습니다.
- 소지 목록(개수 표시 필요)과 장착 슬롯(개수 표시 불필요)처럼 요구사항이 다른 화면이 함께 생기자, `DiceSlotUI`의 개수 텍스트 필드를 필수가 아닌 선택 필드로 바꿔 새 스크립트 없이 같은 컴포넌트를 양쪽에서 재사용했습니다.
- Unity 씬 파일 병합 충돌은 git의 라인 단위 병합 대신 `UnityYAMLMerge`로 처리하는 것을 원칙으로 삼았습니다 — 라인 병합이 GameObject 블록을 통째로 날리는 손상을 실제로 겪은 뒤로, 3-way 원본을 직접 추출해 병합하는 방식으로 전환했습니다.

---

## 트러블슈팅

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 팀원과 독립적으로 작업한 브랜치를 `main`에 병합하는 과정에서 `PlayScene.unity`를 중심으로 총 3차례에 걸쳐 병합 충돌이 발생했습니다 (1차 35건, 2차 1건, 3차 9건).

**원인** : 두 브랜치가 서로 다른 GameObject를 동시에 추가하는 단순 add/add 충돌뿐 아니라, 2차 병합에서는 한쪽 브랜치가 `Player`를 재사용 가능한 프리팹으로 전환한 작업이 다른 브랜치가 새로 추가한 `BattleManager`의 직접 참조와 맞물리는 등, 자동 병합으로는 판단할 수 없는 의미적 충돌이 섞여 있었습니다. Unity 씬 파일은 fileID 참조 구조 특성상 git의 라인 단위 병합이 충돌 마커 바깥의 GameObject 블록까지 통째로 손상시키는 경우가 있어 더 위험했습니다.

**해결** : git이 만든 conflict-marker 파일을 직접 손보는 대신 `git show :1/:2/:3:<path>`로 base/local/remote 3-way 원본을 따로 추출해 Unity 설치 경로의 `UnityYAMLMerge`로 병합했습니다. 자동 병합이 실패하거나 의미적 충돌이 남는 지점(오브젝트 위치, 프리팹 전환 유지 여부, 레이어 슬롯 배정 등 총 5건)은 임의로 판단하지 않고 매번 확인을 거쳐 값을 확정했습니다.

</div>

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : Play 모드(Game 뷰)에서만 플레이어·적 스프라이트가 보이지 않는 문제가 발생했습니다. Scene 뷰에서는 정상이었고 콘솔 에러도 없었습니다.

**원인** : 에디터에서 Tags and Layers 설정 작업을 하던 도중 Unity 에디터가 `TagManager.asset`을 자체 캐시로 덮어쓰면서, Sorting Layer 5종(Default/BackGround/Character/Dice UI/Effect)과 Rendering Layer가 전부 `Default` 하나로 리셋됐습니다. 배경·캐릭터 스프라이트가 더 이상 존재하지 않는 Sorting Layer를 참조하게 되자 Unity가 정렬 우선순위 대신 카메라와의 거리로 그리기 순서를 판단해, 배경(z:7.3)이 캐릭터(z:7.75~9)보다 앞에 그려졌습니다.

**해결** : Sorting Layer 5개와 Rendering Layer 8개를 원래 값 그대로 복구해 해결했습니다. 에디터가 프로젝트를 열어둔 채로 `ProjectSettings/*.asset`처럼 실시간 캐시를 들고 있는 파일을 외부에서 직접 수정하면 같은 레이스 컨디션이 재발할 수 있어, 이후로는 이런 파일을 고칠 때 에디터를 닫거나 수정 직후 Reload를 확인하는 방식으로 대응하고 있습니다.

</div>

---

<div class="card-links" style="margin-top: 40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>
