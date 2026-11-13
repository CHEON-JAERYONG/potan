# 포탄대작전 — Claude 인수인계 문서 (먼저 읽기)

턴제 탱크 포격전 웹게임. 친구에게 링크(`?r=방코드`)를 보내면 어디서든 같이 할 수 있음.
- 실제 주소: https://cheon-jaeryong.github.io/potan/  (GitHub Pages, `main` 브랜치 루트)
- 저장소: https://github.com/CHEON-JAERYONG/potan  (공개)
- 현재 버전: **v1.2.0** (2026-11-13) — 상점·강화·코인, 새 탱크 3종, 새 맵 5종, 점프, 예상 경로, 터치 각도 조절, 지형 입체감

## 사용자 선호 (꼭 지키기)
- 대화는 **한국어**, 쉬운 말로. 결과는 실제로 확인한 것만 말하기.
- **무료만**: API 키·유료 서비스·가입이 필요한 것 금지 (공개 MQTT 중계 + GitHub Pages로 운영 중).
- **고치면 같은 주소에 바로 반영**: 새 주소/복사본을 만들지 말고 수정 → 테스트 → `git commit` + `git push` → 실제 주소에서 확인.
  - 커밋 작성자: `git -c user.name=CHEON-JAERYONG -c user.email=CHEON-JAERYONG@users.noreply.github.com commit ...`
- 포트리스풍이지만 **포트리스 이름·캐릭터·그림을 베끼지 않음** — 탱크 9종(상점 3종 포함)·맵은 직접 그린 오리지널. 이 원칙 유지.
- 나중 목표: **플레이스토어 출시** (아래 "다음 할 일" 참고).

## 파일 구조 (빌드 없음, 정적 파일만)
| 파일 | 역할 |
|---|---|
| `index.html` | 화면 3개: `#home`(닉네임·탱크·색) / `#room`(대기실·설정·채팅) / `#game`(캔버스+HUD+터치버튼+결과창). 스크립트·CSS는 `?v=버전`으로 캐시 무효화 |
| `engine.js` | `window.Engine` — 지형(픽셀 마스크), 물리, 무기, 탱크, AI(`aiPlan`). **결정적**(아래 규칙) |
| `draw.js` | `window.Draw` — 캔버스로 탱크·배경·폭발·미니맵을 직접 그림(이미지 파일 없음). `Renderer` 클래스 |
| `app.js` | 화면 전환, 대기실, MQTT 통신, 턴 진행, 키보드/터치 조작(각도 막대·화면 쓸기·점프), 효과음(WebAudio 합성), HUD, 예상 경로 정보(`viewState().pv`), 판 끝 코인 지급 |
| `shop.js` | `window.Shop` — 지갑(코인·보유 탱크·강화, localStorage `pt.wallet`), 상점/강화 창, 탱크 자세히보기 창(하루 끄기 `pt.infoOff`). `TEST_MODE`=테스트 코인 버튼 |
| `style.css` | 전체 스타일. 맨 아래 `모바일 최적화 (v1.1)` 구역이 휴대폰용(`pointer: coarse`, 세로/가로 분기) |
| `vendor/mqtt.min.js` | MQTT 5.16.1 라이브러리 자체 보관 |
| `manifest.webmanifest`, `icon-*.png`, `icon.svg` | 홈 화면 앱 설치(PWA)용. 플레이스토어(TWA) 준비물 |
| `og.png` | 카톡 링크 미리보기 이미지(1200×630) |
| `tools/` | 브라우저 자동 테스트(playwright-core + 설치된 크롬), 아이콘 생성 |

## 절대 규칙: 시뮬레이션은 결정적이어야 함
- 모든 기기가 같은 입력으로 같은 결과를 계산해야 온라인이 맞음.
- `engine.js`의 시뮬레이션(World/ShotSim/Terrain 마스크) 안에서 `Math.random()`, `Date.now()`, 화면 크기 등 **기기마다 다른 값 금지**. 난수는 `mulberry32(seed)`만.
- 고정 간격 `C.DT = 1/120`. 그리기 전용 값(`Terrain.base`, 파티클 등)은 시뮬 결과에 영향 주면 안 됨.
- 엔진을 바꾸면 옛 버전 기기와 결과가 달라지므로 **`app.js`의 `VERSION`과 `index.html`의 `?v=` 5곳(css·engine·draw·shop·app)을 같이 올리기**.
- 강화 단계는 `start` 메시지의 `init.players[].up`으로 전달 → 모든 기기가 `Engine.tankStats()`로 같은 체력·이동·피해배율·필살충전을 계산. 맵 모양은 `THEMES[theme].shape`(hills/terrace/canyon/islands/floating/ruins), 물 높이는 `sea`.
- 점프(`World.startJump/stepJump`)는 조준 단계의 이동처럼 내 기기에서만 움직이고 위치를 `mv`로 보냄(발사 입력에 x,y가 들어가므로 결정성 문제 없음).
- 지형 그림: `Terrain.paint()`가 조명 없는 바탕색(`unlit`)을 저장, `shadeRect()`가 모양에 따라 조명(입체감)을 계산. `carve()`는 구멍 주변만 다시 계산 → 구멍은 투명(뒤 배경이 보임). 그리기 전용이라 결과엔 영향 없음.

## 온라인 구조 (서버 없음)
- 공개 MQTT 2곳에 동시 접속: `wss://broker.emqx.io:8084/mqtt`, `wss://public.cloud.shiftr.io`(public/public, 443 — 회사망 통과용).
- 토픽 하나: `potan-battle/v1/<방코드>/m`, JSON 메시지, `mid`로 중복 제거.
- 메시지: `hello`/`upd`/`room`/`kick`/`bye`(대기실), `start`, `fire`/`pass`/`item`/`mv`(턴), `hb`(방장 2.5초마다 상태 체크섬), `sync-req`/`sync`(재동기화), `chat`.
- 쏜 사람이 화면 없이 한 발을 끝까지 계산 → 입력+결과(탱크 상태·구멍 목록)+다음 턴 정보를 보냄 → 모두 같은 계산으로 애니메이션 후 결과로 맞춤(지형이 다르면 구멍 목록으로 다시 그림).
- 방장: 컴퓨터 턴 계산, 자리 비운 사람 턴 넘김, 체크섬. 방장이 나가면 가장 먼저 들어온 사람이 승계. 새로고침하면 같은 자리로 자동 재입장(sessionStorage `pt.room`, 탭별 아이디 `pt.sid`).
- 연습 모드는 통신 없이 브라우저 안에서만.

## 디버그 손잡이
브라우저 콘솔에서 `window.__pt` → `me, R(방), G(게임), world, phase, aim, keys, fireNow(), startCharge(), useItem(), selectWeapon(), Net`.

## 로컬 실행 · 테스트
```bash
# 게임 폴더에서
python -m http.server 8765 --bind 127.0.0.1      # → http://127.0.0.1:8765/
# 처음 한 번
cd tools && npm install                          # playwright-core만 설치(브라우저는 설치된 크롬 사용)
# 테스트 (다른 창에서, 게임 폴더 기준)
node tools/test-practice.js       # 연습 모드 한 판
node tools/test-online.js         # 창 2개 온라인 대전(실제 공개 중계 사용) — 턴마다 두 화면 체력·구멍·바람 일치 확인
node tools/test-mobile.js         # 휴대폰 4가지 크기(세로 390/360, 가로 844/740) 홈·대기실·게임 캡처
node tools/test-crater-fall.js snow   # 구멍 표시 · 낙하 피해 없음 확인 (맵: meadow desert snow lava candy night canyon tropic skyland ruins autumn)
node tools/test-v12.js            # v1.2: 자세히보기·하루끄기 · 상점 사기/강화 · 예상 경로 · 점프 · 각도 끌기 · 코인 보상 · 맵 캡처 (MAPS=meadow,canyon 로 맵 지정)
node tools/test-rematch-rejoin.js / test-host-reload.js / test-misc.js   # 한 판 더·새로고침 재입장·방장 새로고침 복구
# 실제 주소로 테스트: BASE=https://cheon-jaeryong.github.io/potan/ node tools/test-online.js
# 크롬 경로가 다르면: CHROME="경로" node tools/...
```
스크린샷은 `tools/shots/`(git 제외)에 저장됨. 캡처를 직접 열어 눈으로 확인하는 것까지가 테스트.

## 배포
```bash
git add -A && git -c user.name=CHEON-JAERYONG -c user.email=CHEON-JAERYONG@users.noreply.github.com commit -m "..." && git push
```
1분 안에 반영. 확인: `gh api repos/CHEON-JAERYONG/potan/pages/builds/latest --jq .status` 가 `built`, 그리고 실제 주소의 `index.html`에 새 `?v=`가 보이는지.
(GitHub CLI `gh`가 로그인돼 있어야 push 가능 — 집 PC에서 처음이면 `gh auth login`)

## 버전 기록
- v1.0.0: 첫 공개. 탱크 6종(쿵쾅·삼총사·두더지·번개·통통·매눈, 무기 2개+필살), 맵 6종, 아이템 4종, 개인전/팀전, 컴퓨터(쉬움·보통·어려움), 최대 8명.
- v1.0.1: 낙하 피해 제거(물에 빠지면 탈락은 유지). 폭발 구멍을 확실히 뚫리게 — 그을음 테두리 제거, 원래 땅 윤곽(`Terrain.base`) 아래는 먼 산 대신 하늘을 칠함.
- v1.1.0: 모바일 최적화 — 세로 HUD 3줄(각도·파워 / 무기 / 아이템), 가로 HUD 한 줄, 내 정보 칸 대신 이동 게이지를 이동 버튼 아래에, 발사 버튼 둘레 파워 링, 내 차례 아닐 때 버튼 흐리게, 채팅 알림 왼쪽 위로, 노치 안전영역, 세로에서 확대 배율 키움, 두 손가락 확대·축소, 전체화면 버튼(⛶)·가로 고정, 진동(내 차례·발사), 가로 화면에서 첫 화면 로고·대기실 시작 버튼 정리, PWA manifest·아이콘(홈 화면에 추가 시 전체화면 앱).
- v1.2.0: ① 휴대폰 각도 조절을 ▲▼ 대신 **각도 막대 위아래로 밀기 + 화면 위아래로 쓸기**(HUD 각도 칸도 끌기 가능) ② **예상 경로**: 내 차례에 꼭대기까지만 점선(파워 모으는 중엔 그 파워, 아니면 지난 파워/50) ③ **코인·상점·강화**(shop.js, 테스트 코인 버튼) ④ 새 탱크 3종 곰돌·폭죽·요술(새 무기 효과: 하늘에서 떨어지는 포탄 `meteor`, 순간이동 `tele`) ⑤ 탱크 고르면 **자세히보기** 창 + **하루 동안 끄기**(ⓘ로는 언제든) ⑥ 새 맵 5종(붉은협곡·열대섬·하늘섬·폐허도시·단풍언덕, 맵마다 지형 모양 다름) ⑦ **점프**(J, 한 턴 1번, 게이지 30) ⑧ 지형 입체감(빛·그늘), 탱크 그림자, 먼 산 3겹+안개, 물 깊이 그라데이션 ⑨ 폭발 구멍은 원래 땅 윤곽에 하늘을 칠하던 방식을 없애고 **뒤 배경이 자연스럽게 보이게**.

## 다음 할 일 (아이디어)
1. **플레이스토어 출시** — 두 가지 길
   - (가장 쉬움) **TWA**: 지금 웹을 그대로 앱으로 감쌈. PWABuilder(웹) 또는 Bubblewrap(CLI)로 AAB 생성. 주소창 없이 열리려면 Digital Asset Links 필요 → `https://cheon-jaeryong.github.io/.well-known/assetlinks.json` 이 **도메인 루트**에 있어야 해서 `CHEON-JAERYONG.github.io` 저장소가 따로 필요(또는 커스텀 도메인).
   - **Capacitor 등으로 파일을 앱 안에 넣기**: 오프라인 연습 가능, 온라인은 그대로 MQTT.
   - 비용: Google Play 개발자 등록 1회 $25 (이것만 유료 — 사용자에게 미리 알릴 것). 이 외엔 무료로 가능.
   - 참고: 회사 PC에는 예전에 다른 앱(coffee-game)을 Gradle 없이 빌드한 포터블 도구가 `D:\androidbuild`에 있었음(집 PC엔 없음).
2. **수익화 준비**(v1.2에서 코인·상점 뼈대 완성): 출시 전 `shop.js`의 `TEST_MODE=false`. 광고 보상(AdMob 보상형 광고 → `Wallet.add`), 코인 팩 인앱결제(Play Billing — TWA면 Digital Goods API) 연결 자리. 지금은 지갑이 브라우저 저장소라 조작 가능 → 진짜 돈이 오가면 서버 검증 필요(무료 원칙과 충돌하므로 그때 사용자와 상의).
3. 출시 전 보완 후보: 효과음/배경음 다양화, 튜토리얼, 탱크·맵 추가, 닉네임 금칙어, 중계 서버가 막힐 때 안내, 결과 공유 이미지, 광고(AdMob) 자리.
4. 알려진 한계: 공개 중계 서버라 보장 없음(2곳 동시 접속으로 완화), 계산을 각자 브라우저가 해서 마음먹으면 조작 가능(친구끼리용), 아이폰은 전체화면 API가 없어 "홈 화면에 추가"로 써야 전체화면.
