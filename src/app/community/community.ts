import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatComponent } from '../ai-chat/ai-chat';
import { CommunityService } from '../services/community';

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface PostWithDetails {
  id?: number;
  userId?: number;
  title?: string;
  content?: string;
  tags?: string[];
  likesCount?: number;
  createdAt?: string;
  author?: string;
  authorRole?: string;
  timeAgo?: string;
  commentsCount?: number;
  isLiked?: boolean;
  showComments?: boolean;
  comments?: CommentItem[];
  loadingComments?: boolean;
}

export interface CommentItem {
  id?: number;
  postId: number;
  content: string;
  createdAt?: string;
  User?: { id: number; name: string };
}

export interface SummaryCard {
  title: string;
  value: number;
  biIcon: string;   // اسم أيقونة Bootstrap Icons (بدون bi-)
  color: string;
  loading?: boolean;
}

export interface TopicItem {
  name: string;
  posts: number;
}

export interface ActiveMember {
  name: string;
  posts: number;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

@Component({
  selector: 'app-community',
  imports: [CommonModule, SideBar, FormsModule, AiChatComponent],
  templateUrl: './community.html',
  styleUrl: './community.css',
  standalone: true
})
export class Community implements OnInit, OnDestroy {

  // ── Sidebar Reference ──
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  // ── حالة الصفحة ──
  isLoading       = false;
  isCreatingPost  = false;
  errorMessage    = '';
  successMessage  = '';

  // ── بيانات المستخدم الحالي (تأتي من AuthService أو LocalStorage) ──
  currentUser: { id: number; name: string } | null = null;

  // ── بطاقات الإحصائيات العلوية
  //    تُعبّأ من API عبر loadCommunityStats()
  //    summaryCards[0] → إجمالي المنشورات   (يُعرض في WELCOME + METRICS)
  //    summaryCards[1] → الأعضاء النشطون     (يُعرض في WELCOME + METRICS)
  //    summaryCards[2] → إجمالي التفاعلات   (يُعرض في METRICS)
  summaryCards: SummaryCard[] = [
    { title: 'المشاركات',       value: 0, biIcon: 'file-text',   color: 'blue' },
    { title: 'الأعضاء النشطين', value: 0, biIcon: 'people',      color: 'green' },
    { title: 'التفاعلات',       value: 0, biIcon: 'heart',        color: 'orange' }
  ];

  // ── المنشورات ──
  allPosts: PostWithDetails[] = [];   // جميع المنشورات كما أتت من API
  posts:    PostWithDetails[] = [];   // المنشورات بعد الفلترة / البحث

  // ── الشريط الجانبي ──
  topTopics:    TopicItem[]   = [];   // مشتقة من allPosts.tags عبر computeTopics()
  activeMembers: ActiveMember[] = []; // تأتي من API عبر loadActiveMembers()

  // ── الفلترة ──
  selectedFilter = 'all';
  searchQuery    = '';

  // قائمة الفلاتر — biIcon هو اسم أيقونة Bootstrap Icons
  availableFilters: { value: string; label: string; biIcon: string }[] = [
    { value: 'all',      label: 'الكل',              biIcon: 'list-ul' },
    { value: 'popular',  label: 'الأكثر شعبية',     biIcon: 'fire' },
    { value: 'recent',   label: 'الأحدث',            biIcon: 'clock-history' },
    { value: 'my-posts', label: 'منشوراتي',          biIcon: 'person' }
  ];

  // قائمة الوسوم المتاحة للاختيار عند إنشاء منشور جديد
  availableTags = ['تسويق', 'مبيعات', 'إدارة', 'تقنية', 'تمويل', 'استراتيجية', 'نصائح', 'أسئلة'];

  // ── موديل المنشور الجديد ──
  newPost = { title: '', content: '', tags: [] as string[] };
  showNewPostModal = false;

  // ── التعليقات — يحفظ محتوى حقل الإدخال لكل منشور بمعرّفه ──
  newCommentContent: { [postId: number]: string } = {};

  // ── حالات الـ UI ──
  showGuide          = false;
  isSidebarCollapsed = false;

  constructor(private communityService: CommunityService) {}

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadPosts();
    this.loadActiveMembers();
  }

  ngOnDestroy(): void {}

  // ─────────────────────────────────────────────
  // AUTH / USER
  // ─────────────────────────────────────────────

  /** يستخرج بيانات المستخدم الحالي من localStorage */
  private loadCurrentUser(): void {
    try {
      const raw = localStorage.getItem('user');
      this.currentUser = raw ? JSON.parse(raw) : null;
    } catch {
      this.currentUser = null;
    }
  }

  // ─────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────

  onSidebarToggle(collapsed: boolean): void {
    this.isSidebarCollapsed = collapsed;
  }

  /** يفتح الـ sidebar على موبايل/تابلت */
  openSidebar(): void {
    this.sidebarComponent?.openMobile();
  }

  // ─────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────

  /**
   * ENDPOINT: GET /api/v1/community/posts
   * يجلب جميع المنشورات ثم يُحدّث:
   *   - allPosts / posts
   *   - summaryCards[0].value (إجمالي المنشورات)
   *   - summaryCards[2].value (إجمالي التفاعلات)
   *   - topTopics (عبر computeTopics)
   */
  loadPosts(tag?: string): void {
    this.isLoading = true;
    this.communityService.getPosts(tag).subscribe({
      next: (res: any) => {
        const data: any[] = Array.isArray(res) ? res : res?.posts ?? res?.data ?? [];
        this.allPosts = data.map(p => this.mapPost(p));
        this.summaryCards[0].value = this.allPosts.length;
        this.summaryCards[2].value = this.allPosts.reduce((s, p) => s + (p.likesCount || 0), 0);
        this.computeTopics();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showError('تعذّر تحميل المنشورات، يرجى المحاولة مجدداً');
        this.isLoading = false;
      }
    });
  }

  /**
   * ENDPOINT: GET /api/v1/community/stats  (أو نقطة نهاية مناسبة)
   * يجلب قائمة الأعضاء النشطين ويُحدّث:
   *   - activeMembers
   *   - summaryCards[1].value (عدد الأعضاء)
   */
  loadActiveMembers(): void {
    // TODO: استبدل بـ endpoint حقيقي بعد أن يتوفر من الباك
    // مثال: this.communityService.getActiveMembers().subscribe(...)
    this.activeMembers = [];
    this.summaryCards[1].value = 0;
  }

  /**
   * ENDPOINT: GET /api/v1/community/posts/:id/comments
   * يُحمَّل عند أول ضغطة على زر التعليقات (toggleComments)
   * يُحدّث post.comments و post.loadingComments
   */
  private loadComments(post: PostWithDetails): void {
    if (!post.id) return;
    post.loadingComments = true;
    this.communityService.getComments(post.id).subscribe({
      next: (res: any) => {
        post.comments = Array.isArray(res) ? res : res?.comments ?? res?.data ?? [];
        post.loadingComments = false;
      },
      error: () => {
        post.comments = [];
        post.loadingComments = false;
      }
    });
  }

  // ─────────────────────────────────────────────
  // POSTS — الفلترة والبحث
  // ─────────────────────────────────────────────

  /**
   * تُطبّق الفلتر الحالي والبحث على allPosts وتُحدّث posts[]
   * posts[] هي المصدر الذي يعرضه قسم POSTS في HTML
   */
  applyFilters(): void {
    let filtered = [...this.allPosts];

    if (this.selectedFilter === 'popular') {
      filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (this.selectedFilter === 'recent') {
      filtered.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else if (this.selectedFilter === 'my-posts') {
      filtered = filtered.filter(p => p.userId === this.currentUser?.id);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.author?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    this.posts = filtered;
  }

  /** يُغيّر الفلتر النشط ويُعيد تطبيق الفلترة */
  changeFilter(filter: string): void {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  /**
   * النقر على وسم في المنشور أو في قائمة المواضيع الشائعة
   * يُحدّث searchQuery ثم يُعيد الفلترة
   */
  filterByTag(tag: string): void {
    this.searchQuery = tag;
    this.selectedFilter = 'all';
    this.applyFilters();
  }

  /** يُستدعى من حقل البحث عند الكتابة */
  searchPosts(): void {
    this.applyFilters();
  }

  // ─────────────────────────────────────────────
  // POSTS — العمليات الرئيسية
  // ─────────────────────────────────────────────

  /**
   * ENDPOINT: POST /api/v1/community/posts
   * يُنشئ منشوراً جديداً ويُضيفه لأول allPosts
   * يُحدّث: summaryCards[0].value، topTopics، posts[]
   */
  createPost(): void {
    if (!this.newPost.title.trim()) { this.showError('الرجاء إدخال عنوان المنشور'); return; }
    if (!this.newPost.content.trim()) { this.showError('الرجاء إدخال محتوى المنشور'); return; }

    this.isCreatingPost = true;
    this.communityService.createPost({
      title:   this.newPost.title.trim(),
      content: this.newPost.content.trim(),
      tags:    [...this.newPost.tags]
    }).subscribe({
      next: (res: any) => {
        const created = this.mapPost(res?.post ?? res);
        this.allPosts.unshift(created);
        this.summaryCards[0].value = this.allPosts.length;
        this.computeTopics();
        this.applyFilters();
        this.isCreatingPost = false;
        this.closeNewPostModal();
        this.showSuccess('تم نشر المنشور بنجاح!');
      },
      error: () => {
        this.showError('تعذّر نشر المنشور، يرجى المحاولة مجدداً');
        this.isCreatingPost = false;
      }
    });
  }

  /**
   * ENDPOINT: DELETE /api/v1/community/posts/:id
   * يحذف المنشور ويُزيله من allPosts ثم يُعيد الفلترة
   * يُحدّث: summaryCards[0].value، topTopics
   */
  deletePost(post: PostWithDetails): void {
    if (!post.id) return;
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;

    this.communityService.deletePost(post.id).subscribe({
      next: () => {
        this.allPosts = this.allPosts.filter(p => p.id !== post.id);
        this.summaryCards[0].value = this.allPosts.length;
        this.computeTopics();
        this.applyFilters();
        this.showSuccess('تم حذف المنشور بنجاح');
      },
      error: () => this.showError('تعذّر حذف المنشور')
    });
  }

  /**
   * ENDPOINT: PUT /api/v1/community/posts/:id/like
   * يُبدّل حالة الإعجاب ويُحدّث:
   *   - post.isLiked، post.likesCount
   *   - summaryCards[2].value (إجمالي التفاعلات)
   */
  toggleLike(post: PostWithDetails): void {
    if (!post.id) return;
    this.communityService.toggleLike(post.id).subscribe({
      next: (res: any) => {
        post.isLiked    = res?.isLiked ?? !post.isLiked;
        post.likesCount = res?.likesCount ?? (post.likesCount || 0) + (post.isLiked ? 1 : -1);
        this.summaryCards[2].value = this.allPosts.reduce((s, p) => s + (p.likesCount || 0), 0);
      },
      error: () => this.showError('تعذّر تسجيل الإعجاب')
    });
  }

  // ─────────────────────────────────────────────
  // COMMENTS
  // ─────────────────────────────────────────────

  /**
   * يُبدّل ظهور التعليقات
   * إذا كانت المرة الأولى يستدعي loadComments() (GET /posts/:id/comments)
   */
  toggleComments(post: PostWithDetails): void {
    post.showComments = !post.showComments;
    if (post.showComments && (!post.comments || post.comments.length === 0)) {
      this.loadComments(post);
    }
  }

  /**
   * ENDPOINT: POST /api/v1/community/posts/:id/comments
   * يُضيف التعليق في أعلى قائمة post.comments
   * يُحدّث post.commentsCount (المعروض في تذييل المنشور)
   */
  addComment(post: PostWithDetails): void {
    if (!post.id) return;
    const content = this.newCommentContent[post.id];
    if (!content?.trim()) { this.showError('الرجاء كتابة تعليق'); return; }

    this.communityService.addComment(post.id, content.trim()).subscribe({
      next: (res: any) => {
        const comment: CommentItem = res?.comment ?? {
          id:        Date.now(),
          postId:    post.id!,
          content:   content.trim(),
          createdAt: new Date().toISOString(),
          User:      { id: this.currentUser?.id || 0, name: this.currentUser?.name || 'أنت' }
        };
        if (!post.comments) post.comments = [];
        post.comments.unshift(comment);
        post.commentsCount = (post.commentsCount || 0) + 1;
        this.newCommentContent[post.id!] = '';
        this.showSuccess('تم إضافة التعليق بنجاح');
      },
      error: () => this.showError('تعذّر إضافة التعليق')
    });
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /**
   * يحسب المواضيع الشائعة من allPosts.tags
   * يُستدعى بعد loadPosts() وبعد createPost() وبعد deletePost()
   * النتيجة (topTopics) تُعرض في sidebar قسم "المواضيع الشائعة"
   */
  computeTopics(): void {
    const counts: { [k: string]: number } = {};
    this.allPosts.forEach(p => (p.tags || []).forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    }));
    this.topTopics = Object.entries(counts)
      .map(([name, posts]) => ({ name, posts }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);
  }

  /**
   * يُحوّل الكائن القادم من API إلى PostWithDetails
   * يُستخدم في loadPosts() و createPost()
   */
  private mapPost(p: any): PostWithDetails {
    return {
      id:            p.id,
      userId:        p.userId ?? p.User?.id,
      title:         p.title,
      content:       p.content,
      tags:          Array.isArray(p.tags) ? p.tags : [],
      likesCount:    p.likesCount ?? 0,
      createdAt:     p.createdAt,
      author:        p.User?.name ?? p.author ?? 'مجهول',
      authorRole:    p.User?.role ?? p.authorRole ?? 'رائد أعمال',
      timeAgo:       this.toTimeAgo(p.createdAt),
      commentsCount: p.commentsCount ?? 0,
      isLiked:       p.isLiked ?? false,
      showComments:  false,
      comments:      [],
      loadingComments: false
    };
  }

  /** يحوّل تاريخ ISO إلى نص "قبل X ساعة" */
  private toTimeAgo(iso?: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (days  > 0) return `قبل ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    if (hours > 0) return `قبل ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    if (mins  > 0) return `قبل ${mins} ${mins === 1 ? 'دقيقة' : 'دقائق'}`;
    return 'الآن';
  }

  /** يتحقق إذا كان المنشور للمستخدم الحالي لإظهار زر الحذف */
  isMyPost(post: PostWithDetails): boolean {
    return post.userId === this.currentUser?.id;
  }

  // ─────────────────────────────────────────────
  // MODAL — منشور جديد
  // ─────────────────────────────────────────────

  openNewPostModal(): void {
    this.newPost = { title: '', content: '', tags: [] };
    this.showNewPostModal = true;
  }

  closeNewPostModal(): void {
    this.showNewPostModal = false;
    this.newPost = { title: '', content: '', tags: [] };
  }

  /** يُضيف/يُزيل وسماً من newPost.tags */
  toggleTag(tag: string): void {
    const i = this.newPost.tags.indexOf(tag);
    if (i > -1) this.newPost.tags.splice(i, 1);
    else        this.newPost.tags.push(tag);
  }

  // ─────────────────────────────────────────────
  // GUIDE MODAL
  // ─────────────────────────────────────────────

  openGuide():  void { this.showGuide = true; }
  closeGuide(): void { this.showGuide = false; }

  // ─────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────

  showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.successMessage = '', 3000);
  }

  showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 4000);
  }
}