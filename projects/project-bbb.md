---
layout: page
title: Project BBB
permalink: /projects/project-bbb/
---

> Unreal Engine 5 기반 1인 액션 게임 | 개인 프로젝트 (개발 중)

<div class="card-links">
  <a class="btn" href="https://github.com/KimJinsun610/Project_BBB" target="_blank">GitHub</a>
  <a class="btn" href="https://youtu.be/-PDFx8YqYMc" target="_blank">YouTube</a>
  <a class="btn" href="https://www.notion.so/UNREAL-2eaeaebf4a0d8040ba38c7a177fde2be" target="_blank">개발 일지(Notion)</a>
</div>

---

## 개요

| 항목 | 내용 |
|------|------|
| 개발 언어 | C++ |
| 개발 환경 | Visual Studio 2022, Unreal Engine 5.4, GitHub |
| 개발 인원 | 1인 |
| 개발 기간 | 2026.02 ~ 진행 중 |

---

## 클래스 계층 구조

```
AActor
└── ABBBCharacterBase          ← 무기 장착/교환, StatComponent, DebuffComponent
    ├── ABBBCharacterPlayer    ← 입력/이동, 조준, 무기 전환, 인벤토리
    └── ABBBEnemyBase          ← AI, 아이템 드롭, 사망 처리
        ├── ABBBEnemyMelee
        └── ABBBEnemyRange

AActor
└── ABBBWeaponBase             ← Attack() / StopAttack() 순수 가상 함수
    ├── ABBBWeaponMelee        ← HitBox 기반 콤보 공격
    └── ABBBWeaponRanged       ← 디버프 발사체 스폰, 쿨다운 관리

UActorComponent
├── UBBBStatComponent          ← HP, 데미지, 사망
├── UBBBDebuffComponent        ← 디버프 적용/만료/UI 연동
└── UBBBInventoryComponent     ← 아이템 보관/사용
```

---

## 구현 상세

<div class="detail-toc">
  <a href="#sec-1">1. 캐릭터 계층 구조</a>
  <span class="toc-sep">*</span>
  <a href="#sec-2">2. WeaponBase 추상화</a>
  <span class="toc-sep">*</span>
  <a href="#sec-3">3. 전략적 전투 루프</a>
  <span class="toc-sep">*</span>
  <a href="#sec-4">4. BehaviorTree AI</a>
  <span class="toc-sep">*</span>
  <a href="#sec-5">5. 아이템 / 인벤토리</a>
  <span class="toc-sep">*</span>
  <a href="#sec-6">6. HittableInterface</a>
  <span class="toc-sep">*</span>
  <a href="#sec-7">7. Niagara 이펙트</a>
</div>


<a id="sec-1"></a>

## 1. 캐릭터 계층 구조 (CharacterBase 공통화)

**설계 목표**

플레이어와 적이 공유하는 공격 방식, 피격 처리, 컴포넌트 부착을 하나의 Base로 통합.
새 캐릭터 추가 시 중복 코드 없이 상속만으로 기반 기능 확보.

- **StatComponent**, **DebuffComponent** 부착 — 플레이어/적 모두 동일한 피격·사망 처리
- 공격 방식 지정/교환 로직을 Base에서 통합 — Player, Enemy 모두 재사용
- 새 캐릭터 추가 시 **CharacterBase** 상속만으로 기반 기능 자동 확보

---

<a id="sec-2"></a>

## 2. WeaponBase 추상화 — Base 수정 없이 원거리/근거리 무기 독립 확장

**설계 목표**

무기 종류가 늘어도 캐릭터나 Base 코드를 수정하지 않고 확장 가능한 구조.
캐릭터는 무기 종류를 몰라도 **Attack()** 한 줄로 공격 가능.

**Attack()** / **StopAttack()**을 순수 가상 함수로 선언하여 무기 종류별 독립 구현

```
WeaponBase::Attack()   ← PURE_VIRTUAL
   ├── WeaponMelee     : HitBox 활성화, 콤보 애니메이션 재생
   └── WeaponRanged    : ProjectileDebuff 스폰, 발사 쿨다운 관리
```
**설계 포인트**
- 캐릭터는 **CurrentWeapon->Attack()** 한 줄만 호출 — 무기 종류를 직접 알 필요 없음
- V키 입력 시 **Equip()** / **Unequip()**으로 플레이어 무기 교체, WeaponBase 코드 수정 불필요

---

<a id="sec-3"></a>

## 3. 전략적 전투 루프 — 방어 게이지 제거 → 근거리 마무리

**설계 목표**

단순히 데미지를 누적하는 전투가 아닌, 원거리 방어 게이지를 제거하고 근거리로 마무리하는 전략적 교전 흐름 구현.
원거리 공격은 데미지가 없는 대신 방어 게이지 제거, 디버프 상태에서 근거리 마무리

**설계 포인트**
- 원거리만으로는 처치 불가 → 방어 게이지 제거 후 접근하는 플레이 유도
- 일정 시간 후 방어 게이지 초기화 → 타이밍 관리가 전략 요소로 작용

<img class="detail-img" src="{{ '/assets/img/debuff.gif' | relative_url }}" alt="공격 루프 시스템 시연">

<div class="flow-card">
  <div class="flow-phase">
    <span class="flow-phase-label">원거리 모드 (기본)</span>
    <ul class="flow-steps">
      <li>발사체 명중 → 방어 게이지 감소</li>
      <li>방어 게이지 0 → 방어 해제 + Stun 적용</li>
      <li>HP바 위 방패 아이콘으로 잔여 게이지 표시</li>
    </ul>
  </div>
  <div class="flow-switch">V키 전환 ↓</div>
  <div class="flow-phase">
    <span class="flow-phase-label">근거리 모드</span>
    <ul class="flow-steps">
      <li>방어 해제 상태 적에게 데미지</li>
      <li>방어 게이지 잔존 시 처치 불가</li>
    </ul>
  </div>
</div>


---

<a id="sec-4"></a>

## 4. BehaviorTree 기반 AI — 탐지·순찰·추격·공격 상태 전환

**설계 목표**

플레이어 감지 여부와 공격 가능 거리에 따라 AI 행동을 자동 전환.
Blackboard 값만으로 상태를 분기하여 C++ 코드 수정 없이 행동 패턴 조정 가능.

| 상태 | 조건 | 행동 |
|------|------|------|
| 순찰 | Target 없음 | 랜덤 위치 이동 → 대기 반복 |
| 추격 | Target 있음, 사정거리 밖 | 플레이어 방향으로 이동 |
| 공격 | Target 있음, 사정거리 내 | 발사체 공격 |


<img class="detail-img" src="{{ '/assets/img/AI_BT.png' | relative_url }}" alt="BehaviorTree 구조">

```
Root
 └── Selector  (Detect 서비스 : 0.9s ~ 1.1s 주기 탐색)
      ├── On Target  (Blackboard: Target is Set)
      │    └── Selector  (Detect 서비스 : 0.0s ~ 0.2s 재탐색)
      │         ├── CanAttack_Ranged  →  Attack              ← 사정거리 내
      │         └── CanAttack_Ranged (inversed)  →  Move To  ← 추격
      └── No Target  (Blackboard: Target is Not Set)
           └── Sequence
                ├── Wait  (0.5 ± 1.0s)
                ├── FindPatrolPos
                └── Move To PatrolPos
```


---

<a id="sec-5"></a>

## 5. DataTable 기반 아이템 / 인벤토리

### 5-1. 아이템 시스템 — DataTable로 확장성 확보

**설계 목표**

초기에는 재화(Gold) 아이템만 존재했습니다.
HP 회복 아이템(사과)을 추가하는 과정에서 아이템마다 C++ 코드를 수정하지 않아도 되는 구조가 필요해졌고,
**DT_ItemData** DataTable을 도입하여 행 추가만으로 새 아이템을 등록할 수 있도록 설계했습니다.

**설계 포인트**

- **DT_ItemData** DataTable로 아이템 데이터 관리 → 행만 추가하면 새 아이템 확장, C++ 수정 불필요
- **FName** Row Name(ItemID)으로 아이템 식별 → 별도 enum 추가 없이 DataTable 행 키만으로 구별
- **BBBItemBase**를 AActor 기반으로 추상화 → **OnPickup()** 오버라이드만으로 아이템별 독립 동작 구현

<img class="detail-img" src="{{ '/assets/img/DataTable.png' | relative_url }}" alt="DT_ItemData 구조">

---

### 5-2. 인벤토리 시스템 — Delegate 기반 UI 분리

**설계 목표**

인벤토리 로직과 UI를 Delegate로 완전히 분리.
컴포넌트가 UI를 직접 참조하지 않아 독립적으로 동작하는 구조.

**설계 포인트**

- OnInventoryChanged Multicast Delegate 브로드캐스트 — InventoryComponent가 UI를 직접 참조하지 않는 구조
- RefreshInventory 시 WBP_InventorySlot 동적 생성으로 슬롯 구성
- 아이템 사용 전 사용 가능 확인
- 슬롯 클릭 → 컨텍스트 메뉴 방식 / BgDismiss(전체화면 투명 버튼, ZOrder 0)로 외부 클릭 감지

**픽업 → 보관 → 사용 흐름**

<img class="detail-img" src="{{ '/assets/img/인벤토리.gif' | relative_url }}" alt="인벤토리 시스템 시연">

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 인벤토리를 처음 열면 이미 주운 아이템이 표시되지 않음

**원인** : **WBP_Inventory**는 첫 오픈 시 **CreateWidget**으로 생성 (Lazy 생성).
생성 전에 발생한 **OnInventoryChanged.Broadcast()**는 수신자가 없어 무시됨.

**해결** : **ToggleInventory()**에서 인벤토리를 열 때마다 **ProcessEvent**로 **RefreshInventory** 강제 호출

```cpp
if (bIsInventoryOpen)
{
    InventoryWidget->AddToViewport();

    UFunction* Func = InventoryWidget->FindFunction(FName("RefreshInventory"));
    if (Func) InventoryWidget->ProcessEvent(Func, nullptr);
}
```

</div>

---

<a id="sec-6"></a>

## 6. HittableInterface — 발사체 코드 수정 없이 피격 가능 오브젝트 확장

**설계 목표**

발사체가 Enemy 클래스를 직접 참조하지 않고, 인터페이스 구현 여부만으로
새로운 피격 오브젝트를 추가할 수 있는 구조.

발사체가 피격 대상의 구체적인 클래스를 직접 참조하지 않도록 인터페이스 도입

**설계 포인트**
- **ABBBAppleOnTree**가 인터페이스를 구현 → 발사체에 맞으면 Physics 낙하 후 아이템 스폰
- Enemy 로직과 완전 분리 — 새 피격 오브젝트 추가 시 발사체 코드 수정 불필요

```cpp
void BBBProjectileDebuff::OnProjectileHit()
{
    // Enemy : 기존 DebuffComponent 경로 유지
    if (UBBBDebuffComponent* Debuff = OtherActor->FindComponentByClass<...>())
        Debuff->ApplyDebuff(DebuffData);

    // 그 외 오브젝트 : 인터페이스 구현 여부만 확인
    if (IBBBHittableInterface* Hittable = Cast<IBBBHittableInterface>(OtherActor))
        Hittable->OnHitByProjectile();
}
```

<div class="ts-box" markdown="1">

#### Trouble Shooting

**증상** : 공중에 배치한 사과 오브젝트가 총에 맞자마자 즉시 사라지고 아이템이 스폰됨

**원인** : **ABBBAppleOnTree**가 **ACharacter**를 상속하므로 게임 시작 시 **CharacterMovementComponent**가 중력을 적용.
에디터에서 공중에 배치해도 런타임에서는 이미 바닥에 착지한 상태로 게임이 시작됨.
이후 **SetSimulatePhysics(true)** 호출 시 이미 접촉 중인 지형과 **OnComponentHit**이 즉시 발동.

**해결** : **BeginPlay**에서 **CharacterMovement** 비활성화 + `GravityScale = 0` 설정.
**SetSimulatePhysics** 호출 후 0.1초 딜레이를 두고 **OnComponentHit** 등록.

```cpp
// BeginPlay — 오브젝트 위치 고정
GetCharacterMovement()->DisableMovement();
GetCharacterMovement()->GravityScale = 0.0f;

// 낙하 시작 후 — 즉시 발동 방지
GetWorld()->GetTimerManager().SetTimer(LandingDetectTimer, [this]()
{
    AppleMesh->OnComponentHit.AddDynamic(this, &ABBBAppleOnTree::OnAppleLanded);
}, 0.1f, false);
```

</div>

---

<a id="sec-7"></a>

## 7. Niagara 사망 이펙트 — AnimNotify/타이머 이중 구조로 모든 적 드롭 타이밍 보장

**설계 목표**

몽타주 유무와 관계없이 모든 적 유형에서 사망 이펙트와 아이템 드롭 타이밍이 일관되게 동작하도록 보장.
이펙트·드롭 로직을 단일 함수에 집중하여 경로가 달라도 동일하게 처리.

사망 시 이펙트 재생 타이밍을 몽타주 유무에 관계없이 일관되게 처리

**설계 포인트**
- **OnDeathEffectNotify()** 한 곳에 이펙트·드롭 로직 집중 — 진입 경로가 달라도 동일 함수 호출
- AnimNotify로 몽타주 길이와 무관하게 적마다 정확한 타이밍 제어
- 몽타주 없는 적은 타이머 폴백으로 처리 — 경우를 빠짐없이 대응

<img class="detail-img" src="{{ '/assets/img/Apple.gif' | relative_url }}" alt="아이템&이팩트 시스템 시연">

```
[몽타주 있는 적]
OnEnemyDeath() → 사망 몽타주 재생
  → BBBAnimNotify_DeathEffect 발동 (프레임 정밀 타이밍)
      → OnDeathEffectNotify() : 이펙트 스폰 + DropItems()

[몽타주 없는 적 — 래그돌]
OnEnemyDeath() → 타이머(3.0f) 설정
  → OnDeathEffectNotify() : 이펙트 스폰 + DropItems()

[사과 오브젝트]
Physics 착지 → SpawnItemAndDestroy()
  → OnDeathEffectNotify() : 이펙트 스폰 + DropItems()
```


<div class="card-links" style="margin-top: 40px;">
  <a class="btn btn-primary" href="/">← 목록으로</a>
</div>

<nav class="floating-toc" id="floatingToc">
  <p class="ftoc-title">구현 상세</p>
  <ol>
    <li><a href="#sec-1">캐릭터 계층 구조</a></li>
    <li><a href="#sec-2">WeaponBase 추상화</a></li>
    <li><a href="#sec-3">전략적 전투 루프</a></li>
    <li><a href="#sec-4">BehaviorTree AI</a></li>
    <li><a href="#sec-5">아이템 / 인벤토리</a></li>
    <li><a href="#sec-6">HittableInterface</a></li>
    <li><a href="#sec-7">Niagara 이펙트</a></li>
  </ol>
</nav>

<a class="scroll-up-left" id="scrollUpLeft" href="#" aria-label="맨 위로 이동">↑</a>

<script>
  (function () {
    var btn = document.getElementById('scrollUpLeft');
    var toc = document.getElementById('floatingToc');
    var tocLinks = Array.from(toc.querySelectorAll('a'));
    var sections = [1,2,3,4,5,6,7].map(function(n) {
      return document.getElementById('sec-' + n);
    }).filter(Boolean);
    var trigger = document.querySelector('.detail-toc');

    function onScroll() {
      var y = window.scrollY;

      // 위로 버튼
      btn.classList.toggle('visible', y > 300);

      // 플로팅 TOC: 상단 인라인 TOC를 완전히 지나쳤을 때 표시
      if (trigger) {
        toc.classList.toggle('visible', trigger.getBoundingClientRect().bottom < 0);
      }

      // 현재 섹션 하이라이트
      var current = -1;
      sections.forEach(function(sec, i) {
        if (sec.getBoundingClientRect().top <= 100) current = i;
      });
      tocLinks.forEach(function(link, i) {
        link.classList.toggle('ftoc-active', i === current);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();
</script>
