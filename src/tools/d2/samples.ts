export const SAMPLES = [
  {
    value: 'architecture',
    label: 'Architecture',
    code: `# A small service, from request to storage
direction: right

user: User {shape: person}
cloud: Cloud {
  api: API server
  queue: Job queue {shape: queue}
  worker: Worker
  db: Database {shape: cylinder}

  api -> queue: enqueue
  queue -> worker: process
  worker -> db: write
  api -> db: read
}

user -> cloud.api: HTTPS`,
  },
  {
    value: 'flowchart',
    label: 'Flowchart',
    code: `direction: down

start: New change {shape: oval}
tests: Tests pass? {shape: diamond}
fix: Fix the code
review: Code review
deploy: Deploy {shape: oval}

start -> tests
tests -> fix: no
fix -> tests: retry
tests -> review: yes
review -> deploy: approved`,
  },
  {
    value: 'sequence',
    label: 'Sequence',
    code: `shape: sequence_diagram

user: User
app: Web app
api: API
db: Database

user -> app: Open dashboard
app -> api: GET /stats
api -> db: Query metrics
db -> api: Rows
api -> app: JSON response
app -> user: Show charts`,
  },
  {
    value: 'positions',
    label: 'TALA positioning',
    code: `# TALA supports fixed positions alongside automatic layout.
browser: Browser {
  top: 0
  left: 0
}
api: API {
  top: 0
  left: 400
}
db: Database {shape: cylinder}
cache: Cache

browser -> api: request
api -> db: query
api -> cache: lookup`,
  },
] as const

export const INITIAL_CODE = SAMPLES[0].code
