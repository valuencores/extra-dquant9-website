# DQ9 자산투여금액 조견표

## 프로젝트 개요
Dragon Quest 9 자산 투여금액을 기록·관리하는 대시보드 + 입력 관리자 페이지.

---

## 현재 완성된 기능

### 📊 대시보드 (index.html)
- **KPI 카드**: 총 투여금액 / 적립식 / 일시 / 총 건수 — DB 기반 실시간 집계
- **일별 입금 현황 바 차트**: 월별 필터 (전체/1월/2월/3월)
- **수익 카테고리 도넛 차트**: 당근마켓, AI·강의, 주식·투자 등 9가지 분류
- **월별 입금 카드**: 월별 합계·건수·비율 바
- **입금 내역 상세 테이블**: 페이지당 20건, 페이지네이션
- **D.Quant9 캔버스 로고** (js/logo.js): 어느 페이지에나 `<canvas class="dq9-logo">` 삽입 시 자동 렌더
- **OG 메타 태그**: 카카오톡·SNS 공유 시 피처 이미지(images/og-feature.jpg) 노출
- **플로팅 메뉴(FAB)**: 자산 입력 / 맨 위로 이동

### ✏️ 자산 입력 관리자 (input.html / admin/input.html)
- **로그인**: 세션스토리지 기반 (ID: valuencores / PW: @vnc1201)
- **자산 입력 폼**: 날짜(실시간 자동갱신, 자정 후 1분 내 갱신), 제목, 투여금액, DQ9 누적금액(자동계산), 계좌, 메모
- **DQ9 누적금액 자동계산**: DB의 dq9_amount 최댓값 기준으로 실시간 계산
- **입력 이력 탭**: 전체/최근7일/30일/90일 필터, 삭제 기능
- **통계 현황 탭**: 최신 누적, 전일·주간·월간 변화, 추이 라인차트, 일별 증감 바차트
- **추천 키워드 태그**: 메모 필드에 클릭 한 번으로 추가

### 🗄️ 데이터 초기화 (dq9_full_import.html / dq9_final_b1.html / dq9_final_b2.html)
- 비밀번호 보호 (@vnc1201) + 수동 실행
- 전체 데이터 삭제 후 108건 재삽입 (배치1: 56건, 배치2: 52건)
- 최종 누적값 8,006,964원 자동 검증

---

## 파일 구조

```
index.html              ← 대시보드 메인
input.html              ← 자산 입력 관리자 (루트)
input.js                ← 관리자 JS (루트·admin 겸용)
dq9_full_import.html    ← 배포 DB 초기화 도구 (비번 보호)

css/
  style.css             ← 대시보드 스타일
  input.css             ← 관리자 스타일

js/
  main.js               ← 대시보드 메인 스크립트 (DB 기반)
  logo.js               ← D.Quant9 캔버스 로고 렌더러
  data.js               ← 정적 원본 데이터 (폴백용)
  asset_trend.js        ← (현재 미사용)
  fab.js                ← 플로팅 버튼

admin/
  input.html            ← 자산 입력 관리자 (서브폴더 버전)

images/
  og-feature.jpg        ← SNS 공유용 피처 이미지 (1200×630)
  logo-source.png       ← 로고 원본
```

---

## API 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `tables/asset_records?limit=500` | 전체 기록 조회 (sort 파라미터 제거 - API 버그) |
| POST | `tables/asset_records` | 새 기록 저장 |
| DELETE | `tables/asset_records/{id}` | 기록 삭제 |

---

## 데이터 스키마 (asset_records)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | UUID (자동) |
| record_date | text | YYYY-MM-DD |
| title | text | 거래 제목 |
| total_asset | number | 금일 투여금액 (원) |
| dq9_amount | number | DQ9 누적 투여금액 (원) |
| account | text | 송금 계좌 |
| memo | text | 메모 |
| week_label | text | YYYY-Www |
| month_label | text | YYYY-MM |

---

## 공개 URL

| 환경 | URL |
|------|-----|
| 프로덕션 | https://extra.dquant9.com |
| Genspark 기본 | https://6ac174f2-1441-4792-a4da-3f47b8f2e109.vip.gensparksite.com |
| 개발(편집) | https://tubffskk.gensparkspace.com |

> ⚠️ **두 프로덕션 URL은 동일한 배포본을 가리킵니다.**  
> 개발 환경(tubffskk)의 DB와 프로덕션 DB는 별도입니다.  
> 배포 후 반드시 `dq9_full_import.html`로 프로덕션 DB를 초기화해야 합니다.

---

## ⚡ 배포 후 필수 작업 (프로덕션 DB 동기화)

1. **Publish 탭** → **Publish(재배포)** 클릭 → 완료 대기
2. `dq9_wipe2.html` → `dq9_final_b1.html` → `dq9_final_b2.html` 순서로 실행
3. 108건 입력 완료 후 `🎉 정확히 일치!` 메시지 확인
4. 대시보드(`https://extra.dquant9.com`)에서 **8,006,964원** 확인

---

## 운영 규칙

- **새 거래 입력**: 반드시 `https://extra.dquant9.com/input.html` 사용
- **개발 환경**: 코드 수정 전용, 데이터는 프로덕션에 자동 반영되지 않음
- **데이터 재구축**: `dq9_full_import.html` — 기존 전체 삭제 후 재입력 (중복 없음)

---

## 미구현 / 개선 권장 사항

- [ ] 검색 필터 (제목, 날짜 범위)
- [ ] CSV 내보내기
- [ ] 카테고리 편집 기능
- [ ] 복수 계좌 지원
- [ ] 2026-03-10 이후 신규 데이터 data.js 업데이트

---

## 최근 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-10 | 스프레드시트 기준 108건 DB 재구축. 총 누적 8,006,964원. 계좌명 `DQ9신한계좌` → `헤이온 신한계좌`, 일시투여 계좌 `임현 개인계좌` 반영. 신규 4건 추가 (03.09 당근무쇠솥, 03.10 3건) |
| 2026-03-10 | 대시보드 레이아웃 변경: 월별 3개 박스 → 일별 그래프 위로 이동, 도넛 차트 → 페이지 맪 아래로 이동. 테이블 콜럼 6열 (날짜/제목/금액/카테고리/송금계좌/메모) 정리 |
