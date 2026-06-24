# 배포 가이드

## 전체 아키텍처

```
QR 스캔
  └→ https://yourapp.vercel.app/?serial=1234567890
        └→ React SPA (Vercel)
              └→ API Gateway  GET /watch/{serial}
                    └→ Lambda (getWatchHistory.mjs)
                          └→ DynamoDB (Watches + Sessions)
```

---

## 1. DynamoDB 테이블 생성

AWS Console → DynamoDB → Create table

### TimegraipherWatches
| 항목 | 값 |
|------|-----|
| Table name | `TimegraipherWatches` |
| Partition key | `watch_id` (String) |
| Billing | On-demand |

생성 후 **GSI 추가**: Indexes 탭 → Create index
- Index name: `serial-index`
- Partition key: `serial_number` (String)

### TimegraipherSessions
| 항목 | 값 |
|------|-----|
| Table name | `TimegraipherSessions` |
| Partition key | `watch_id` (String) |
| Sort key | `session_id` (String) |
| Billing | On-demand |

샘플 데이터는 `lambda/dynamodb-schema.json`의 `sample_item` 참고.

---

## 2. Lambda 함수 생성

```bash
# 패키징
cd lambda
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
zip -r function.zip . 
```

AWS Console → Lambda → Create function
- Runtime: Node.js 20.x
- 파일 업로드: `function.zip`
- Handler: `getWatchHistory.handler`

### 환경 변수
| Key | Value |
|-----|-------|
| `WATCHES_TABLE`  | `TimegraipherWatches` |
| `SESSIONS_TABLE` | `TimegraipherSessions` |
| `SERIAL_INDEX`   | `serial-index` |

### IAM 권한 (Lambda Execution Role에 추가)
```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:Query", "dynamodb:GetItem"],
  "Resource": [
    "arn:aws:dynamodb:*:*:table/TimegraipherWatches",
    "arn:aws:dynamodb:*:*:table/TimegraipherWatches/index/*",
    "arn:aws:dynamodb:*:*:table/TimegraipherSessions"
  ]
}
```

---

## 3. API Gateway 설정

AWS Console → API Gateway → Create API → REST API

- Method: `GET`
- Resource: `/watch/{serial}`
- Integration: Lambda Function → `getWatchHistory`
- CORS 활성화 (Enable CORS 체크)

배포 후 URL 형식: `https://xxxxxxxxxx.execute-api.ap-northeast-2.amazonaws.com/prod`

---

## 4. 프론트엔드 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:
```
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.ap-northeast-2.amazonaws.com/prod
```

> 값이 없으면 자동으로 Mock 데이터(Rolex Submariner 데모)로 동작합니다.

---

## 5. Vercel 배포

```bash
# Vercel CLI 설치 (최초 1회)
npm install -g vercel

# 프로젝트 루트에서
npm install
vercel

# 환경 변수 설정
vercel env add VITE_API_BASE_URL
```

또는 GitHub 연동 방법:
1. GitHub에 레포 push
2. vercel.com → New Project → Import 레포
3. Settings → Environment Variables → `VITE_API_BASE_URL` 추가
4. Redeploy

배포 완료 URL 예시: `https://timegrapher-history.vercel.app`

---

## 6. QR 코드 생성

URL 패턴: `https://timegrapher-history.vercel.app/?serial={시리얼번호}`

QR 생성 API (타임그래퍼 앱에서 사용):
```
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://timegrapher-history.vercel.app/?serial=1234567890
```

또는 JavaScript에서:
```js
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(watchUrl)}`
```

---

## 7. 타임그래퍼 앱에서 데이터 저장 (API 예시)

측정 완료 시 Lambda 또는 별도 POST 엔드포인트로 전송:

```json
POST /session
{
  "watch_id": "watch_sub_3235_01",
  "session_id": "log_20260625_01",
  "measured_at": "2026-06-25T10:00:00Z",
  "summary": { "rate": 1.0, "amplitude": 254.0, "beat_error": 0.1 },
  "positions": { ... },
  "tags": ["#정기검진"],
  "user_memo": "...",
  "alert": null
}
```

---

## 로컬 개발

```bash
npm install
npm run dev
# → http://localhost:5173/?serial=DEMO-3235
```

VITE_API_BASE_URL 미설정 시 Mock 데이터 자동 사용.
