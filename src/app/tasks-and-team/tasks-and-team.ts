import { Component, OnInit, ViewChild } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TaskService, Task } from '../services/task';
import { ProjectService, Project } from '../services/project';
import { HttpErrorResponse } from '@angular/common/http';
import { AiChatComponent } from '../ai-chat/ai-chat';


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** مهمة موسّعة بحقول العرض الإضافية */
interface TaskWithDetails extends Task {
  tags?:     string[];
  user?:     string;
  date?:     string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  avatar?:   string;
}

/** عضو الفريق */
interface TeamMember {
  id?:         number;
  name:        string;
  tasks:       number;
  avatar:      string;
  email?:      string;
  role?:       string;
  memberRole?: 'member' | 'admin' | 'owner';
}

/** الحالات المتاحة لعمود الكانبان */
type ColStatus = 'todo' | 'in-progress' | 'review' | 'done';


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Component({
  selector:    'app-tasks-and-team',
  imports:     [SideBar, CommonModule, FormsModule, DragDropModule, AiChatComponent],
  templateUrl: './tasks-and-team.html',
  styleUrl:    './tasks-and-team.css',
  standalone:  true
})
export class TasksAndTeam implements OnInit {

  // ── Sidebar ──────────────────────────────────────────────
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;
  isSidebarCollapsed = false;

  // ── UI States ─────────────────────────────────────────────
  isLoading      = false;
  errorMessage   = '';
  successMessage = '';
  showGuide      = false;

  // ── Project ───────────────────────────────────────────────
  // ENDPOINT: GET /api/v1/projects  →  يُملأ في loadCurrentProject()
  currentProject:   Project | null = null;
  currentProjectId: number         = 0;

  // ── Team ──────────────────────────────────────────────────
  // ENDPOINT: GET /api/v1/projects/:id/members  →  يُملأ في loadTeamMembers()
  // ⬇ تُستخدم قائمة الأعضاء هذه في:
  //    1) قسم "أعضاء الفريق" في الصفحة الرئيسية
  //    2) قائمة "تعيين لعضو" داخل modal إنشاء المهمة
  //    3) قائمة "إدارة الفريق" modal
  teamMembers: TeamMember[] = [];

  // ── Tasks — مصدر واحد للحقيقة ─────────────────────────────
  // ENDPOINT: GET /api/v1/projects/:id/tasks  →  يُملأ في loadTasks()
  // ⬇ allTasks هي المرجع الأساسي، والأعمدة الأربعة تعكسها دائماً
  allTasks: TaskWithDetails[] = [];

  // ── Kanban Columns — ثابتة في الذاكرة (لا تُستبدل، تُعدَّل فقط) ──
  // ⬇ هذه الأعمدة تُعبّئ من allTasks عبر syncColumns()
  //    الـ CDK يحتفظ بـ reference لكل array — لا تُستبدل أبداً
  todoTasks:       TaskWithDetails[] = [];
  inProgressTasks: TaskWithDetails[] = [];
  reviewTasks:     TaskWithDetails[] = [];
  completedTasks:  TaskWithDetails[] = [];

  // ── Modal: إنشاء مهمة ─────────────────────────────────────
  showNewTaskModal = false;
  newTask: TaskWithDetails = {
    projectId:  0,
    title:      '',
    description:'',
    status:     'todo',
    priority:   'medium',
    dueDate:    '',
    tags:       [],
    assignedTo: undefined,
    user:       undefined,
    avatar:     undefined
  };

  // ── Modal: إدارة الفريق ───────────────────────────────────
  // ENDPOINT: POST /api/v1/projects/:id/members  →  يُرسل في addTeamMember()
  // ENDPOINT: DELETE /api/v1/projects/:id/members/:memberId  →  في removeMember()
  // ENDPOINT: PATCH /api/v1/projects/:id/members/:memberId  →  في updateMemberRole()
  showTeamModal  = false;
  isAddingMember = false;
  teamFormErrors: { name?: string; email?: string } = {};
  newMember: {
    name:       string;
    email:      string;
    role:       string;
    memberRole: 'member' | 'admin' | 'owner';
  } = { name: '', email: '', role: '', memberRole: 'member' };

  // ── Options ───────────────────────────────────────────────
  availableTags = ['تسويق', 'تطوير', 'تصميم', 'مبيعات', 'دعم فني', 'إدارة', 'محتوى', 'قانوني'];

  priorityOptions = [
    { value: 'low',    label: 'منخفضة', color: '#95a5a6' },
    { value: 'medium', label: 'متوسطة', color: '#3498db' },
    { value: 'high',   label: 'عالية',  color: '#f39c12' },
    { value: 'urgent', label: 'عاجلة',  color: '#e74c3c' }
  ];

  // ── Filter / Search (مستقبلاً) ────────────────────────────
  selectedFilter: 'all' | 'my-tasks' | 'team-tasks' = 'all';
  searchQuery = '';


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  constructor(
    private taskService:    TaskService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadCurrentProject();
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SIDEBAR
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  onSidebarToggle(collapsed: boolean) { this.isSidebarCollapsed = collapsed; }
  openSidebar() { this.sidebarComponent?.openMobile(); }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GUIDE MODAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  openGuide()  { this.showGuide = true;  }
  closeGuide() { this.showGuide = false; }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DATA LOADING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * ENDPOINT: GET /api/v1/projects
   * يجلب أول مشروع للمستخدم ثم يحمّل مهامه وأعضاءه
   */
  loadCurrentProject(): void {
    this.isLoading = true;
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        if (response?.data?.length > 0) {
          this.currentProject    = response.data[0];
          this.currentProjectId  = this.currentProject!.id!;
          this.newTask.projectId = this.currentProjectId;
          this.loadTasks();
          this.loadTeamMembers();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading    = false;
        }
      },
      error: () => {
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading    = false;
      }
    });
  }

  /**
   * ENDPOINT: GET /api/v1/projects/:projectId/tasks
   * يجلب كل مهام المشروع ويوزّعها على أعمدة الكانبان
   */
  loadTasks(): void {
    this.taskService.getTasks(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.allTasks = response.data.map((task: Task) => ({
            ...task,
            tags:     [],
            priority: this.guessPriority(task),
            date:     this.getRelativeTime(task.createdAt || ''),
            // ENDPOINT: حقل assignedTo يأتي من الباك — اسم أو ID المستخدم المعيَّن
            avatar:   task.assignedTo ? this.getInitial(task.assignedTo.toString()) : '؟'
          }));
          // ⬇ يوزّع allTasks على الأعمدة الأربعة بعد التحميل
          this.syncColumns();
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'حدث خطأ في تحميل المهام';
        this.isLoading    = false;
      }
    });
  }

  /**
   * ENDPOINT: GET /api/v1/projects/:projectId/members
   * يجلب أعضاء الفريق — حالياً يُحسب من allTasks كحل مؤقت
   * ⬇ قائمة teamMembers تظهر في:
   *    - بطاقات أعضاء الفريق في الصفحة
   *    - dropdown "تعيين لعضو" في modal إنشاء المهمة
   */
  loadTeamMembers(): void {
    const teamMap = new Map<string, TeamMember>();
    this.allTasks.forEach(task => {
      if (task.user) {
        if (teamMap.has(task.user)) {
          teamMap.get(task.user)!.tasks++;
        } else {
          teamMap.set(task.user, {
            name:   task.user,
            tasks:  1,
            avatar: this.getInitial(task.user)
          });
        }
      }
    });
    this.teamMembers = Array.from(teamMap.values());
    if (this.teamMembers.length === 0) {
      this.teamMembers = [{ name: 'أنت', tasks: this.allTasks.length, avatar: 'أ' }];
    }
  }

  /** يعيد تحميل المهام عند الضغط على زر التحديث */
  refreshTasks(): void { this.loadTasks(); }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KANBAN — COLUMN SYNC
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * يُعيد the arrays of all 4 columns from allTasks
   * مهم: يُعدِّل الـ arrays في مكانها (in-place) ولا يستبدلها
   * لأن الـ CDK يحتفظ بـ reference لكل array
   */
  syncColumns(): void {
    const cols: Record<ColStatus, TaskWithDetails[]> = {
      'todo':        this.todoTasks,
      'in-progress': this.inProgressTasks,
      'review':      this.reviewTasks,
      'done':        this.completedTasks
    };
    // أفرغ كل عمود في مكانه
    (['todo', 'in-progress', 'review', 'done'] as ColStatus[]).forEach(s => {
      cols[s].length = 0;
    });
    // اعبّئ من allTasks
    this.allTasks.forEach(t => {
      const col = cols[t.status as ColStatus];
      if (col) col.push(t);
    });
  }

  /** يُرجع array العمود المناسب بناءً على الـ status */
  colArray(status: ColStatus): TaskWithDetails[] {
    switch (status) {
      case 'todo':        return this.todoTasks;
      case 'in-progress': return this.inProgressTasks;
      case 'review':      return this.reviewTasks;
      case 'done':        return this.completedTasks;
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KANBAN — DRAG & DROP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * ENDPOINT: PATCH /api/v1/tasks/:taskId  { status: newStatus }
   * يُحدِّث حالة المهمة بعد السحب والإفلات
   * يعمل optimistic update — يُحرِّك الكارت فوراً ويُرجعه لو فشل الباك
   */
  drop(event: CdkDragDrop<TaskWithDetails[]>, newStatus: ColStatus): void {
    // نفس العمود — إعادة ترتيب فقط
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // عمودان مختلفان — انقل الـ item مباشرة بين الـ arrays
    const sourceCol = event.previousContainer.data;
    const targetCol = event.container.data;
    const [task]    = sourceCol.splice(event.previousIndex, 1);
    targetCol.splice(event.currentIndex, 0, task);

    const previousStatus = task.status;
    task.status          = newStatus;

    // حدِّث الـ status في allTasks أيضاً (نفس الـ reference)
    const inAll = this.allTasks.find(t => t.id === task.id);
    if (inAll) inAll.status = newStatus;

    // ENDPOINT: PATCH /api/v1/tasks/:taskId
    if (task.id) {
      this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
        next: () => this.showSuccess(`تم نقل المهمة إلى ${this.getStatusLabel(newStatus)}`),
        error: () => {
          // أرجع الكارت لمكانه لو فشل الباك
          const curIdx = targetCol.findIndex(t => t.id === task.id);
          if (curIdx !== -1) targetCol.splice(curIdx, 1);
          task.status = previousStatus as Task['status'];
          sourceCol.splice(event.previousIndex, 0, task);
          if (inAll) inAll.status = previousStatus as Task['status'];
        }
      });
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TASK CRUD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  openNewTaskModal(): void {
    this.showNewTaskModal = true;
    this.newTask = {
      projectId:   this.currentProjectId,
      title:       '',
      description: '',
      status:      'todo',
      priority:    'medium',
      dueDate:     '',
      tags:        [],
      assignedTo:  undefined,
      user:        undefined,
      avatar:      undefined
    };
  }

  closeNewTaskModal(): void { this.showNewTaskModal = false; }

  /** تبديل وسم في قائمة الوسوم المختارة */
  toggleTag(tag: string): void {
    if (!this.newTask.tags) this.newTask.tags = [];
    const i = this.newTask.tags.indexOf(tag);
    if (i > -1) this.newTask.tags.splice(i, 1);
    else        this.newTask.tags.push(tag);
  }

  /**
   * ENDPOINT: POST /api/v1/projects/:projectId/tasks
   * ينشئ مهمة جديدة — optimistic: يضيفها محلياً فوراً
   * ⬇ المهمة الجديدة تُضاف لـ allTasks وللعمود المناسب مباشرة
   * ⬇ العضو المعيَّن (newTask.user) يأتي من قائمة teamMembers
   */
  createTask(): void {
    if (!this.newTask.title.trim()) {
      this.showError('الرجاء إدخال عنوان المهمة');
      return;
    }

    // ابحث عن العضو المعيَّن في قائمة الفريق عشان تاخد الـ avatar
    const assignedMember = this.teamMembers.find(m => m.name === this.newTask.user);

    const localTask: TaskWithDetails = {
      projectId:   this.currentProjectId,
      title:       this.newTask.title.trim(),
      description: this.newTask.description?.trim() || '',
      status:      this.newTask.status,
      dueDate:     this.newTask.dueDate || undefined,
      priority:    this.newTask.priority,
      tags:        [...(this.newTask.tags || [])],
      date:        'الآن',
      avatar:      assignedMember?.avatar || 'أ',
      user:        this.newTask.user || undefined,
      id:          Date.now() // id مؤقت حتى يرجع الـ id الحقيقي من الباك
    };

    // يضيف المهمة محلياً في allTasks وفي العمود الصح
    const addLocally = (id?: number) => {
      if (id) localTask.id = id;
      this.allTasks.unshift(localTask);
      this.colArray(localTask.status as ColStatus).unshift(localTask);
      this.updateMemberTaskCount(localTask.user, 1);
      this.showSuccess('تم إنشاء المهمة بنجاح');
      this.closeNewTaskModal();
    };

    // لو مفيش project محمل، أضف محلياً فقط
    if (!this.currentProjectId) { addLocally(); return; }

    // ENDPOINT: POST /api/v1/projects/:projectId/tasks
    this.taskService.createTask(this.currentProjectId, {
      projectId:   localTask.projectId,
      title:       localTask.title,
      description: localTask.description,
      status:      localTask.status,
      dueDate:     localTask.dueDate
    }).subscribe({
      next:  (r: any) => addLocally(r.data?.id), // استخدم الـ id الحقيقي من الباك
      error: ()       => addLocally()             // أضف محلياً حتى لو فشل الباك
    });
  }

  /**
   * ENDPOINT: DELETE /api/v1/tasks/:taskId
   * يحذف المهمة فوراً محلياً ويرسل للباك في الخلفية
   */
  deleteTask(task: TaskWithDetails): void {
    if (!task.id) return;

    // أزل من allTasks
    this.allTasks = this.allTasks.filter(t => t.id !== task.id);

    // أزل من العمود مباشرة (in-place)
    const col = this.colArray(task.status as ColStatus);
    const idx = col.findIndex(t => t.id === task.id);
    if (idx !== -1) col.splice(idx, 1);

    this.updateMemberTaskCount(task.user, -1);
    this.showSuccess('تم حذف المهمة');

    // ENDPOINT: DELETE /api/v1/tasks/:taskId
    this.taskService.deleteTask(task.id).subscribe({ error: () => {} });
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TASK COUNTS — GETTERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  get todoCount()       { return this.todoTasks.length;       }
  get inProgressCount() { return this.inProgressTasks.length; }
  get reviewCount()     { return this.reviewTasks.length;     }
  get completedCount()  { return this.completedTasks.length;  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEAM MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  openTeamModal(): void {
    this.showTeamModal  = true;
    this.newMember      = { name: '', email: '', role: '', memberRole: 'member' };
    this.teamFormErrors = {};
  }

  closeTeamModal(): void { this.showTeamModal = false; }

  validateTeamForm(): boolean {
    this.teamFormErrors = {};
    let valid = true;
    if (!this.newMember.name.trim()) {
      this.teamFormErrors.name = 'اسم العضو مطلوب';
      valid = false;
    }
    if (!this.newMember.email.trim()) {
      this.teamFormErrors.email = 'البريد الإلكتروني مطلوب';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newMember.email)) {
      this.teamFormErrors.email = 'البريد الإلكتروني غير صحيح';
      valid = false;
    }
    return valid;
  }

  /**
   * ENDPOINT: POST /api/v1/projects/:projectId/members
   * يضيف عضواً جديداً للفريق
   * ⬇ العضو الجديد يظهر فوراً في:
   *    - قائمة الأعضاء في modal إدارة الفريق
   *    - بطاقات الأعضاء في الصفحة الرئيسية
   *    - dropdown "تعيين لعضو" في modal إنشاء المهمة
   */
  addTeamMember(): void {
    if (!this.validateTeamForm()) return;

    const exists = this.teamMembers.find(m => m.email === this.newMember.email.trim());
    if (exists) {
      this.teamFormErrors.email = 'هذا البريد الإلكتروني مضاف بالفعل';
      return;
    }

    this.isAddingMember = true;

    // ENDPOINT: POST /api/v1/projects/:projectId/members
    const member: TeamMember = {
      id:         Date.now(), // يُستبدل بالـ id الحقيقي من الباك
      name:       this.newMember.name.trim(),
      email:      this.newMember.email.trim(),
      role:       this.newMember.role.trim() || 'عضو فريق',
      avatar:     this.newMember.name.trim().charAt(0),
      tasks:      0,
      memberRole: this.newMember.memberRole
    };

    this.teamMembers.push(member);
    this.newMember      = { name: '', email: '', role: '', memberRole: 'member' };
    this.teamFormErrors = {};
    this.isAddingMember = false;
    this.showSuccess(`✅ تم إضافة ${member.name} للفريق`);
  }

  /**
   * ENDPOINT: DELETE /api/v1/projects/:projectId/members/:memberId
   * يزيل عضواً من الفريق
   */
  removeMember(member: TeamMember): void {
    if (member.memberRole === 'owner') return;
    if (!confirm(`هل أنت متأكد من إزالة "${member.name}" من الفريق؟`)) return;
    // ENDPOINT: DELETE /api/v1/projects/:projectId/members/:memberId
    this.teamMembers = this.teamMembers.filter(m => m.id !== member.id);
    this.showSuccess(`تم إزالة ${member.name} من الفريق`);
  }

  /**
   * ENDPOINT: PATCH /api/v1/projects/:projectId/members/:memberId  { role: memberRole }
   * يُحدِّث دور العضو في الفريق
   */
  updateMemberRole(member: TeamMember): void {
    // ENDPOINT: PATCH /api/v1/projects/:projectId/members/:memberId
    this.showSuccess(`تم تحديث صلاحيات ${member.name}`);
  }

  /** يزيد/ينقص عداد المهام لعضو معين */
  updateMemberTaskCount(memberName: string | undefined, delta: number): void {
    if (!memberName) return;
    const m = this.teamMembers.find(m => m.name === memberName);
    if (m) m.tasks = Math.max(0, m.tasks + delta);
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UTILITIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  getStatusLabel(status: Task['status']): string {
    const labels: Record<string, string> = {
      'todo':        'قائمة المهام',
      'in-progress': 'قيد التنفيذ',
      'review':      'المراجعة',
      'done':        'المكتملة'
    };
    return labels[status] || status;
  }

  getInitial(text: string): string {
    return text.charAt(0).toUpperCase();
  }

  /**
   * يخمّن الأولوية بناءً على تاريخ الاستحقاق
   * ENDPOINT: لو الباك بيبعت حقل priority جاهز، استخدمه مباشرة بدل هذه الدالة
   */
  guessPriority(task: Task): 'low' | 'medium' | 'high' | 'urgent' {
    if (task.dueDate) {
      const days = Math.floor((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
      if (days < 1) return 'urgent';
      if (days < 3) return 'high';
      if (days < 7) return 'medium';
    }
    return 'medium';
  }

  getRelativeTime(dateString: string): string {
    if (!dateString) return 'اليوم';
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7)   return `منذ ${days} أيام`;
    return `منذ ${Math.floor(days / 7)} أسابيع`;
  }

  getPriorityColor(priority?: string): string {
    return this.priorityOptions.find(p => p.value === priority)?.color || '#95a5a6';
  }

  getPriorityLabel(priority?: string): string {
    return this.priorityOptions.find(p => p.value === priority)?.label || 'متوسطة';
  }

  /** trackBy للـ ngFor — يمنع Angular من إعادة رسم الكروت عند الـ drag */
  trackById(_: number, task: TaskWithDetails): number | undefined {
    return task.id;
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NOTIFICATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => { this.successMessage = ''; }, 3000);
  }

  showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => { this.errorMessage = ''; }, 3000);
  }
}