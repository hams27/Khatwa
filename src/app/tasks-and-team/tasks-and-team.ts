import { Component, OnInit, ViewChild } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskService, Task } from '../services/task';
import { ProjectService, Project } from '../services/project';
import { HttpErrorResponse } from '@angular/common/http';
import { AiChatComponent } from '../ai-chat/ai-chat';


// Extended Task Interface
interface TaskWithDetails extends Task {
  tags?: string[];
  user?: string;
  date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  avatar?: string;
}

// Team Member Interface
interface TeamMember {
  id?: number;
  name: string;
  tasks: number;
  avatar: string;
  email?: string;
  role?: string;
  memberRole?: 'member' | 'admin' | 'owner';
}

@Component({
  selector: 'app-tasks-and-team',
  imports: [SideBar, CommonModule, FormsModule, DragDropModule ,AiChatComponent],
  templateUrl: './tasks-and-team.html',
  styleUrl: './tasks-and-team.css',
  standalone: true
})
export class TasksAndTeam implements OnInit {

  // ── Sidebar Reference ──
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  // Loading & Error States
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showGuide = false;

  // Current Project
  currentProject: Project | null = null;
  currentProjectId: number = 0;

  // Team Members (Dynamic)
  teamMembers: TeamMember[] = [];

  // Tasks organized by status (for Drag & Drop)
  todoTasks: TaskWithDetails[] = [];
  inProgressTasks: TaskWithDetails[] = [];
  reviewTasks: TaskWithDetails[] = [];
  completedTasks: TaskWithDetails[] = [];

  // All tasks (for filtering)
  allTasks: TaskWithDetails[] = [];

  // New Task Form
  showNewTaskModal = false;

  // Team Management Modal
  showTeamModal = false;
  isAddingMember = false;
  teamFormErrors: { name?: string; email?: string } = {};
  newMember: { name: string; email: string; role: string; memberRole: 'member' | 'admin' | 'owner' } = {
    name: '', email: '', role: '', memberRole: 'member'
  };
  newTask: TaskWithDetails = {
    projectId: 0,
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    tags: [],
    assignedTo: undefined,
    user: undefined,
    avatar: undefined
  };

  // Available Tags
  availableTags = [
    'تسويق',
    'تطوير',
    'تصميم',
    'مبيعات',
    'دعم فني',
    'إدارة',
    'محتوى',
    'قانوني'
  ];

  // Priority Options
  priorityOptions = [
    { value: 'low', label: 'منخفضة', color: '#95a5a6' },
    { value: 'medium', label: 'متوسطة', color: '#3498db' },
    { value: 'high', label: 'عالية', color: '#f39c12' },
    { value: 'urgent', label: 'عاجلة', color: '#e74c3c' }
  ];

  // Filter
  selectedFilter: 'all' | 'my-tasks' | 'team-tasks' = 'all';
  searchQuery = '';

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService
  ) { }

  isSidebarCollapsed = false;

  ngOnInit(): void {
    console.log('📋 Tasks & Team Component Initialized');
    this.loadCurrentProject();
  }

  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  /** يفتح الـ sidebar على موبايل/تابلت */
  openSidebar() {
    this.sidebarComponent?.openMobile();
  }

  openGuide() { this.showGuide = true; }
  closeGuide() { this.showGuide = false; }

  // Load Current Project
  loadCurrentProject() {
    this.isLoading = true;

    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        console.log('📦 Projects loaded:', response);

        if (response && response.data && response.data.length > 0) {
          this.currentProject = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          this.newTask.projectId = this.currentProjectId;

          // Load tasks and team
          this.loadTasks();
          this.loadTeamMembers();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading = false;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading projects:', error);
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading = false;
      }
    });
  }

  // Load Tasks
  loadTasks() {
    this.taskService.getTasks(this.currentProjectId).subscribe({
      next: (response: any) => {
        console.log('📝 Tasks loaded:', response);

        if (response && response.data) {
          this.allTasks = response.data.map((task: Task) => ({
            ...task,
            tags: [],
            priority: this.guessPriority(task),
            date: this.getRelativeTime(task.createdAt || ''),
            avatar: task.assignedTo ? this.getInitial(task.assignedTo.toString()) : '؟'
          }));

          // Organize tasks by status
          this.organizeTasks();
        }

        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading tasks:', error);
        this.errorMessage = 'حدث خطأ في تحميل المهام';
        this.isLoading = false;
      }
    });
  }

  // Load Team Members
  loadTeamMembers() {
    // For now, calculate from tasks
    // In the future, this can come from a Team API
    const teamMap = new Map<string, TeamMember>();

    this.allTasks.forEach(task => {
      if (task.user) {
        if (teamMap.has(task.user)) {
          teamMap.get(task.user)!.tasks++;
        } else {
          teamMap.set(task.user, {
            name: task.user,
            tasks: 1,
            avatar: this.getInitial(task.user)
          });
        }
      }
    });

    this.teamMembers = Array.from(teamMap.values());

    // Add mock members if empty
    if (this.teamMembers.length === 0) {
      this.teamMembers = [
        { name: 'أنت', tasks: this.allTasks.length, avatar: 'أ' }
      ];
    }
  }

  // Organize Tasks by Status
  organizeTasks() {
    this.todoTasks       = this.allTasks.filter(t => t.status === 'todo');
    this.inProgressTasks = this.allTasks.filter(t => t.status === 'in-progress');
    this.reviewTasks     = this.allTasks.filter(t => t.status === 'review');
    this.completedTasks  = this.allTasks.filter(t => t.status === 'done');
  }

  // 🎯 Drag & Drop Handler
  drop(event: CdkDragDrop<TaskWithDetails[]>, newStatus: Task['status']) {
    const task = event.item.data as TaskWithDetails;
    const previousStatus = task.status;

    if (event.previousContainer === event.container) {
      // Same container - just reorder
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Different container - transfer item
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update status on the task object and in allTasks
      task.status = newStatus;
      const taskInAll = this.allTasks.find(t => t.id === task.id);
      if (taskInAll) taskInAll.status = newStatus;

      // Update in backend
      if (task.id) {
        this.updateTaskStatus(task.id, newStatus, previousStatus);
      }
    }
  }

  // Update Task Status in Backend
  updateTaskStatus(taskId: number, newStatus: Task['status'], previousStatus: Task['status']) {
    this.taskService.updateTask(taskId, { status: newStatus }).subscribe({
      next: (response: any) => {
        console.log('✅ Task status updated:', response);
        this.showSuccess(`تم نقل المهمة إلى ${this.getStatusLabel(newStatus)}`);
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error updating task:', error);
        this.showError('حدث خطأ في تحديث المهمة');

        // Revert on error
        const task = this.allTasks.find(t => t.id === taskId);
        if (task) {
          task.status = previousStatus;
          this.organizeTasks();
        }
      }
    });
  }

  // Get Status Label
  getStatusLabel(status: Task['status']): string {
    const labels = {
      'todo': 'قائمة المهام',
      'in-progress': 'قيد التنفيذ',
      'review': 'المراجعة',
      'done': 'المكتملة'
    };
    return labels[status] || status;
  }

  // Open New Task Modal
  openNewTaskModal() {
    this.showNewTaskModal = true;
    this.newTask = {
      projectId: this.currentProjectId,
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      tags: [],
      assignedTo: undefined,
      user: undefined,
      avatar: undefined
    };
  }

  // Close New Task Modal
  closeNewTaskModal() {
    this.showNewTaskModal = false;
  }

  // Toggle Tag
  toggleTag(tag: string) {
    if (!this.newTask.tags) {
      this.newTask.tags = [];
    }

    const index = this.newTask.tags.indexOf(tag);
    if (index > -1) {
      this.newTask.tags.splice(index, 1);
    } else {
      this.newTask.tags.push(tag);
    }
  }

  // Create Task
  createTask() {
    // Validation
    if (!this.newTask.title.trim()) {
      this.showError('الرجاء إدخال عنوان المهمة');
      return;
    }

    // Build the new task object to add locally
    const assignedMember = this.teamMembers.find(m => m.name === this.newTask.user);
    const localTask: TaskWithDetails = {
      projectId: this.currentProjectId,
      title: this.newTask.title.trim(),
      description: this.newTask.description?.trim() || '',
      status: this.newTask.status,
      dueDate: this.newTask.dueDate || undefined,
      priority: this.newTask.priority,
      tags: [...(this.newTask.tags || [])],
      date: 'الآن',
      avatar: assignedMember?.avatar || 'أ',
      user: this.newTask.user || undefined,
      id: Date.now()
    };

    // If no project loaded yet, add locally immediately
    if (!this.currentProjectId) {
      this.allTasks.unshift(localTask);
      this.organizeTasks();
      this.updateMemberTaskCount(localTask.user, 1);
      this.showSuccess('تم إنشاء المهمة بنجاح');
      this.closeNewTaskModal();
      return;
    }

    const taskData: Task = {
      projectId: this.currentProjectId,
      title: localTask.title,
      description: localTask.description,
      status: localTask.status,
      dueDate: localTask.dueDate
    };

    this.taskService.createTask(this.currentProjectId, taskData).subscribe({
      next: (response: any) => {
        console.log('✅ Task created:', response);
        localTask.id = response.data?.id || localTask.id;
        this.allTasks.unshift(localTask);
        this.organizeTasks();
        this.updateMemberTaskCount(localTask.user, 1);
        this.showSuccess('تم إنشاء المهمة بنجاح');
        this.closeNewTaskModal();
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error creating task via API, adding locally:', error);
        // Add locally even if API fails
        this.allTasks.unshift(localTask);
        this.organizeTasks();
        this.updateMemberTaskCount(localTask.user, 1);
        this.showSuccess('تم إنشاء المهمة بنجاح');
        this.closeNewTaskModal();
      }
    });
  }

  // Update member task count
  updateMemberTaskCount(memberName: string | undefined, delta: number) {
    if (!memberName) return;
    const member = this.teamMembers.find(m => m.name === memberName);
    if (member) member.tasks = Math.max(0, member.tasks + delta);
  }

  // Delete Task
  deleteTask(task: TaskWithDetails) {
    if (!task.id) return;

    // Remove locally immediately
    this.allTasks = this.allTasks.filter(t => t.id !== task.id);
    this.organizeTasks();
    this.updateMemberTaskCount(task.user, -1);
    this.showSuccess('تم حذف المهمة');

    // Try API delete in background
    this.taskService.deleteTask(task.id).subscribe({
      next: () => console.log('🗑️ Task deleted from server'),
      error: (error: HttpErrorResponse) => console.error('❌ API delete failed (removed locally):', error)
    });
  }

  // Utility Functions

  getInitial(text: string): string {
    return text.charAt(0).toUpperCase();
  }

  guessPriority(task: Task): 'low' | 'medium' | 'high' | 'urgent' {
    // Simple heuristic
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 1) return 'urgent';
      if (daysUntilDue < 3) return 'high';
      if (daysUntilDue < 7) return 'medium';
    }
    return 'medium';
  }

  getRelativeTime(dateString: string): string {
    if (!dateString) return 'اليوم';

    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'اليوم';
    if (diffInDays === 1) return 'أمس';
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
    return `منذ ${Math.floor(diffInDays / 7)} أسابيع`;
  }

  getPriorityColor(priority?: string): string {
    const option = this.priorityOptions.find(p => p.value === priority);
    return option?.color || '#95a5a6';
  }

  getPriorityLabel(priority?: string): string {
    const option = this.priorityOptions.find(p => p.value === priority);
    return option?.label || 'متوسطة';
  }

  showSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  // Getters for task counts
  get todoCount() {
    return this.todoTasks.length;
  }

  get inProgressCount() {
    return this.inProgressTasks.length;
  }

  get reviewCount() {
    return this.reviewTasks.length;
  }

  get completedCount() {
    return this.completedTasks.length;
  }

  // Refresh
  refreshTasks() {
    this.loadTasks();
  }

  // ===== TEAM MANAGEMENT =====
  openTeamModal() {
    this.showTeamModal = true;
    this.newMember = { name: '', email: '', role: '', memberRole: 'member' };
    this.teamFormErrors = {};
  }

  closeTeamModal() {
    this.showTeamModal = false;
  }

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

  addTeamMember() {
    if (!this.validateTeamForm()) return;

    // Check duplicate email
    const exists = this.teamMembers.find(m => m.email === this.newMember.email.trim());
    if (exists) {
      this.teamFormErrors.email = 'هذا البريد الإلكتروني مضاف بالفعل';
      return;
    }

    this.isAddingMember = true;

    const member: TeamMember = {
      id: Date.now(),
      name: this.newMember.name.trim(),
      email: this.newMember.email.trim(),
      role: this.newMember.role.trim() || 'عضو فريق',
      avatar: this.newMember.name.trim().charAt(0),
      tasks: 0,
      memberRole: this.newMember.memberRole
    };

    this.teamMembers.push(member);
    this.newMember = { name: '', email: '', role: '', memberRole: 'member' };
    this.teamFormErrors = {};
    this.isAddingMember = false;
    this.showSuccess(`✅ تم إضافة ${member.name} للفريق`);
  }

  removeMember(member: TeamMember) {
    if (member.memberRole === 'owner') return;
    if (!confirm(`هل أنت متأكد من إزالة "${member.name}" من الفريق؟`)) return;
    this.teamMembers = this.teamMembers.filter(m => m.id !== member.id);
    this.showSuccess(`تم إزالة ${member.name} من الفريق`);
  }

  updateMemberRole(member: TeamMember) {
    this.showSuccess(`تم تحديث صلاحيات ${member.name}`);
  }

}