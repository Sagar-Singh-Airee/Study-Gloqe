# 🌐 Study-Gloqe System Architecture

This guide provides a visual map of the Study-Gloqe platform, illustrating how components, data, and users interact.

---

## 🏗️ Core Platform Map
The high-level relationship between the client application and cloud services.

```mermaid
graph LR
    subgraph "Frontend (React + Vite)"
        LD[Landing Page] --> AUTH[Auth Engine]
        AUTH --> STU[Student Dashboard]
        AUTH --> TEA[Teacher Dashboard]
    end

    subgraph "Cloud Infrastructure"
        FS[(Firestore DB)]
        BQ[(BigQuery Analytics)]
        STG[(Storage - PDFs)]
        AI[[AI Engine]]
    end

    STU <--> FS
    TEA <--> FS
    STU --> BQ
    TEA --> BQ
    STU --> STG
    STG --> AI
    AI --> FS
```

---

## 👨‍🎓 Student: The Learning Journey
How a student moves from raw content to refined knowledge.

```mermaid
flowchart TD
    Start([Login]) --> Dashboard[Student Dashboard]
    Dashboard --> Upload[PDF Upload]
    Upload --> Process[AI Analysis]
    Process --> Study[Study Session]
    
    subgraph "Study Execution"
        Study --> Timer[Reactive Timer]
        Study --> Quiz[AI Quiz Runner]
        Study --> Cards[Flashcard Engine]
    end
    
    Timer --> History[Activity History]
    Quiz --> History
    
    History --> Sync[Reactive Sync Engine]
    Sync --> Streak{True Streak Fix}
    
    Streak -->|Update| DB[(Firestore)]
    Streak -->|Display| Dashboard
```

---

## 👨‍🏫 Teacher: Oversight & Management
How a teacher manages classrooms and tracks student growth.

```mermaid
flowchart TD
    Login([Teacher Login]) --> TD[Teacher Dashboard]
    
    subgraph "Management Layer"
        TD --> Classes[Classroom Manager]
        Classes --> Code[Generate Unique Code]
        Classes --> Anno[Announcements]
    end
    
    subgraph "Analytics Layer"
        TD --> Analytics[Performance Charts]
        Analytics --> AtRisk[At-Risk Detection]
        TD --> Grading[Automatic Gradebook]
    end
    
    subgraph "Interaction"
        Code -.-> Student
        Grading <==>|Aggregates| StudyHistory[(Student Activity)]
    end
```

---

## 🔗 The Bridge: Classroom Connection
The shared space where Teachers and Students intersect.

```mermaid
graph TD
    Teacher[Teacher] -- "Creates" --> Class[Classroom ID]
    Class -- "Hosts" --> Room[Live Study Room]
    Class -- "Deploys" --> Assign[Assignments/Quizzes]
    
    Student[Student] -- "Joins via Code" --> Class
    Student -- "Participates" --> Room
    Student -- "Submits" --> Assign
    
    Assign -- "Feedback" --> Student
    Assign -- "Results" --> Teacher
```

---

## 📊 Data Flow Architecture
The relationship between real-time data and long-term analytical data.

```mermaid
graph LR
    subgraph "Real-Time (Firestore)"
        U[Users]
        S[Sessions]
        D[Docs]
    end

    subgraph "Analytical (BigQuery)"
        BQH[Historical Trends]
        BQA[AI Insights]
    end

    subgraph "Sync Engine"
        SE[Cloud Functions]
    end

    S --> SE
    SE --> BQH
    U --> Dashboard[Frontend Display]
    BQH --> Dashboard
```

---

## 🎨 Visual Design System (Tokens)
| Module | Theme | Key Interaction |
| :--- | :--- | :--- |
| **Core** | Glassmorphic | Framer Motion Layouts |
| **Student** | Vibrant / Gamified | Streak Fire Animations |
| **Teacher** | Professional / Clean | Dynamic Data Tables |
| **Analytics** | Dark Mode Hero | interactive Chart.js Views |
