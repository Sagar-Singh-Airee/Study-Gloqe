# Study-Gloqe: Deep-Dive Logic Flowcharts

> **Detailed algorithmic flows for key application systems.**  
> _Use this document to understand the "How" and "Why" of the system's logic._

---

## 1. 📄 Document Processing & AI Subject Detection Pipeline
*The exact journey a PDF takes from user drag-and-drop to becoming a study resource.*

```mermaid
graph TB
    subgraph "Client Side (React)"
        Start((User Uploads PDF)) --> Validate{Is Valid PDF?}
        Validate -- No --> Error[Show Error Toast]
        Validate -- Yes --> Read[FileReader API Read]
        Read --> Extract[Extract Text Preview]
        
        Extract --> AI_Check{AI Detection?}
        
        subgraph "AI Subject Detection"
            AI_Check -- Yes --> API_Call[Call Gemini AI]
            API_Call --> Analyze[Analyze Text Content]
            Analyze --> Classify[Return Subject + Tags]
        end
        
        AI_Check -- No --> User_Input[User Selects Subject]
        
        Classify --> Meta[Prepare Metadata]
        User_Input --> Meta
        
        Meta --> Upload_Start[Start Firebase Upload]
    end
    
    subgraph "Server Side (Firebase)"
        Upload_Start --> Storage[(Firebase Storage)]
        Storage --> URL[Get Download URL]
        
        URL --> DB_Entry[Create Firestore Document]
        DB_Entry --> Index[Add Search Index]
        
        Index --> Event[Publish 'Document Uploaded' Event]
    end
    
    Event --> Update_UI((Update Dashboard))
    
    style Start fill:#81c784,stroke:#2e7d32,color:white
    style Error fill:#e57373,color:white
    style AI_Check fill:#ba68c8,color:white
    style Storage fill:#ffca28
    style DB_Entry fill:#ffca28
```

---

## 2. 🎮 The Gamification Engine Logic
*How the system decides when to level up a user or award a badge.*

```mermaid
graph TB
    Action((User Tracks Action)) --> Input[Receive Action Type + Data]
    
    subgraph "XP Calculation Engine"
        Input --> Base_XP[Lookup Base XP]
        Base_XP --> Streak_Check{Has Active Streak?}
        Streak_Check -- Yes --> Multiplier[Apply 1.5x Multiplier]
        Streak_Check -- No --> Normal[No Multiplier]
        
        Multiplier --> Total_XP[Calculate Total XP]
        Normal --> Total_XP
    end
    
    subgraph "Level System"
        Total_XP --> Add_XP[Add to User Current XP]
        Add_XP --> Level_Check{Current XP >= Next Level Threshold?}
        
        Level_Check -- Yes --> Level_Up[Increment Level]
        Level_Up --> Rewards[Unlock Title/Feature]
        Level_Up --> Next_Level[Calculate New Threshold]
        Level_Check -- No --> Continue
    end
    
    subgraph "Badge Evaluation System"
        Continue --> Fetch_Badges[Fetch Badge Criteria]
        Fetch_Badges --> Eval_Loop{For Each Badge}
        
        Eval_Loop --> Criteria_Check{Criteria Met?}
        Criteria_Check -- Yes --> Owned_Check{Already Owned?}
        
        Owned_Check -- No --> Grant[Grant Badge]
        Grant --> Notify[Queue Notification]
        Owned_Check -- Yes --> Skip
        Criteria_Check -- No --> Skip
        
        Skip --> Eval_Loop
    end
    
    Notify --> Finish((Save to DB))
    
    style Action fill:#4fc3f7,stroke:#01579b
    style Total_XP fill:#ffd54f
    style Level_Up fill:#81c784,stroke:#2e7d32
    style Grant fill:#ba68c8,color:white
```

---

## 3. ⏱️ The Study Session Lifecycle
*The state machine governing a user's active study time.*

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    state "Idle (Dashboard)" as Idle
    state "Active Studying" as Active {
        [*] --> TimerRunning
        
        state "Timer Running" as TimerRunning
        state "Paused" as Paused
        state "Distraction Check" as Distraction
        
        TimerRunning --> Paused : User Clicks Pause
        Paused --> TimerRunning : User Resumes
        
        TimerRunning --> Distraction : No Activity (5m)
        Distraction --> Paused : User Unresponsive
        Distraction --> TimerRunning : User Activity Detected
    }
    
    Idle --> Active : Open Document/Room
    Active --> Completed : Stop Session (Min 5m)
    Active --> Abandoned : Stop Session (< 5m)
    
    state "Session Completion" as Completed {
        CalcTime --> CalcXP
        CalcXP --> SaveStats
        SaveStats --> SyncBigQuery
    }
    
    Completed --> Summary : Show Summary Modal
    Abandoned --> Idle : Discard Data
    Summary --> Idle : Close
    
    note right of Active
        Tracking:
        - Total Duration
        - Focus Score
        - Pages Read
    end note
```

---

## 4. 🤖 AI Quiz Generation Flow
*From raw text to an interactive quiz using Gemini.*

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant SubjectDetector
    participant GeminiAPI
    participant Parser
    participant DB
    
    User->>Frontend: Click "Generate Quiz"
    Frontend->>SubjectDetector: Identify Topic Context
    
    loop Chunking Strategy
        Frontend->>Frontend: Split Document into Chunks (Tokens)
        Frontend->>Frontend: Select Relevant Chunks
    end
    
    Frontend->>GeminiAPI: Prompt: "Generate 5 MCQs on [Topic]..."
    GeminiAPI-->>Frontend: Returns JSON String
    
    rect rgb(230, 240, 255)
        Note over Frontend, Parser: Validation Phase
        Frontend->>Parser: Validate JSON Structure
        Parser->>Parser: Check for Questions/Options/Answers
        Parser-->>Frontend: Valid Quiz Object
    end
    
    Frontend->>DB: Save Quiz (Status: Ready)
    Frontend->>User: Redirect to Quiz Page
    
    User->>Frontend: Submit Answers
    Frontend->>Frontend: Calculate Score
    Frontend->>DB: Update User Stats (XP, Accuracy)
    Frontend-->>User: Show Results & Explanations
```

---

## 5. ⚡ Realtime Event Synchronization
*The technical data path for keeping all clients in sync.*

```mermaid
graph TD
    subgraph "Origin Client"
        U_Act[User Action] --> Evt_Bus[Event Bus Service]
        Evt_Bus --> Loc_State[Optimistic UI Update]
        Evt_Bus --> API_Call[Firebase Write]
    end
    
    subgraph "Cloud Infrastructure"
        API_Call --> Firestore[(Firestore DB)]
        
        Firestore --> Triggers[Cloud Functions]
        Triggers --> Kafka[Kafka Producer]
        Kafka --> Topic[Event Topic]
    end
    
    subgraph "Listening Clients (Dashboard)"
        Firestore -.->|onSnapshot| Listener[Snapshot Listener]
        Listener --> Diff_Check{Data Changed?}
        Diff_Check -- Yes --> State_Up[Update React State]
        State_Up --> Re_Render[Re-render Component]
        Diff_Check -- No --> Ignore
    end
    
    style U_Act fill:#ffcc80
    style Evt_Bus fill:#ffcc80
    style Firestore fill:#ffab91
    style Kafka fill:#ce93d8
    style Listener fill:#80cbc4
```

---

## How to use:
*   **Developers**: Use diagrams 2, 3, and 5 to understand the code logic before refactoring.
*   **Pitch Deck**: Diagram 1 is excellent for showing "How it Works".
*   **QA Team**: Use Diagram 3 to test edge cases in study sessions (e.g., distraction checks).
