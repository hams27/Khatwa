import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PostWithDetails {
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

interface CommentItem {
  id?: number;
  postId: number;
  content: string;
  createdAt?: string;
  User?: { id: number; name: string; };
}

interface SummaryCard {
  title: string;
  value: number;
  icon: string;
  color: string;
  loading?: boolean;
}

interface TopicItem {
  name: string;
  posts: number;
}

const MOCK_POSTS: PostWithDetails[] = [
  {
    id: 1, userId: 2,
    title: 'كيف تبني علامة تجارية قوية من الصفر؟',
    content: 'بعد سنتين من العمل على مشروعي، تعلمت أن العلامة التجارية ليست مجرد لوجو وألوان — هي القصة التي تحكيها لعملائك. ابدأ بتحديد قيمك الأساسية، ثم اسأل: لماذا أنت مختلف؟ ما المشكلة التي تحلها بشكل أفضل من غيرك؟ شاركوني تجاربكم!',
    tags: ['تسويق', 'استراتيجية'],
    likesCount: 47,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    author: 'أحمد الشمري', authorRole: 'مؤسس شركة ناشئة', timeAgo: 'قبل ساعتين',
    commentsCount: 8, isLiked: false, showComments: false, comments: [], loadingComments: false
  },
  {
    id: 2, userId: 3,
    title: 'نصيحة ذهبية: لا تبدأ بالمنتج، ابدأ بالعميل',
    content: 'أكبر خطأ ارتكبته في مشروعي الأول أنني صممت المنتج كاملاً قبل أن أكلم عميلاً واحداً. أضعت ٦ أشهر و٥٠ ألف ريال. المشروع الثاني بدأت بـ٢٠ مقابلة مع عملاء محتملين قبل كتابة سطر كود واحد. النتيجة؟ وصلنا للـ product-market fit في أقل من ٣ أشهر.',
    tags: ['نصائح', 'إدارة'],
    likesCount: 93,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    author: 'سارة المنصوري', authorRole: 'رائدة أعمال', timeAgo: 'قبل ٥ ساعات',
    commentsCount: 21, isLiked: true, showComments: false, comments: [], loadingComments: false
  },
  {
    id: 3, userId: 4,
    title: 'تجربتي مع تمويل المشاريع في السعودية',
    content: 'تقدمت لأكثر من ١٥ صندوق استثمار العام الماضي. معظمهم يريدون رؤية: ١) نمو واضح في الإيرادات ٢) فريق متكامل ٣) حصة سوقية قابلة للدفاع. الحل الأسهل للمبتدئين: ابدأ بـ bootstrapping حتى تصل لـ١٠٠ ألف ريال ARR، ثم اذهب للمستثمرين وأنت في موضع قوة.',
    tags: ['تمويل', 'استراتيجية'],
    likesCount: 61,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    author: 'خالد الحربي', authorRole: 'مستثمر ملاك', timeAgo: 'أمس',
    commentsCount: 14, isLiked: false, showComments: false, comments: [], loadingComments: false
  },
  {
    id: 4, userId: 5,
    title: 'كيف وظفت أول موظف ووفرت ٤٠٪ من وقتي؟',
    content: 'قضيت ٨ أشهر أعمل وحدي ١٤ ساعة يومياً. القرار الأصعب كان الثقة بشخص آخر على مشروعي. لكن الوظيفة الأولى غيرت كل شيء — شاركت المهام الإدارية، ركزت على المبيعات والمنتج، وضاعفت الإيرادات خلال ٣ أشهر. الدرس: تعلم كيف تتخلى عن السيطرة بذكاء.',
    tags: ['إدارة', 'نصائح'],
    likesCount: 38,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    author: 'نورة القحطاني', authorRole: 'مديرة تنفيذية', timeAgo: 'قبل يومين',
    commentsCount: 6, isLiked: false, showComments: false, comments: [], loadingComments: false
  },
  {
    id: 5, userId: 6,
    title: 'سؤال: ما أفضل أداة CRM للشركات الصغيرة؟',
    content: 'مشروعنا ناشئ ولدينا حوالي ١٢٠ عميل. نستخدم الإكسل حالياً وبدأ يصبح مرهقاً. هل تنصحون بـ HubSpot للبداية أم Notion أم شيء آخر؟ الميزانية محدودة تقريباً ٥٠٠ ريال شهرياً.',
    tags: ['تقنية', 'أسئلة'],
    likesCount: 15,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    author: 'فيصل العتيبي', authorRole: 'رائد أعمال', timeAgo: 'قبل ٣ ساعات',
    commentsCount: 11, isLiked: false, showComments: false, comments: [], loadingComments: false
  },
  {
    id: 6, userId: 7,
    title: 'قصة نجاح: من ٠ إلى ١٠٠ عميل في ٦٠ يوماً',
    content: 'لما أطلقنا خدمتنا لإدارة السوشيال ميديا للمطاعم، استخدمنا تكتيك بسيط جداً: تواصلنا مع ٢٠٠ مطعم يومياً عبر الإنستجرام وقدمنا أسبوع مجاني. ٥٪ منهم وافقوا، ٤٠٪ من المجانيين تحولوا لعملاء مدفوعين. الدرس: Volume + Value = Growth.',
    tags: ['مبيعات', 'تسويق', 'نصائح'],
    likesCount: 124,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    author: 'منال الزهراني', authorRole: 'مؤسسة وكالة رقمية', timeAgo: 'قبل ٤ أيام',
    commentsCount: 33, isLiked: true, showComments: false, comments: [], loadingComments: false
  }
];

const MOCK_COMMENTS: { [k: number]: CommentItem[] } = {
  1: [
    { id: 1, postId: 1, content: 'رائع جداً! أنا أيضاً مررت بنفس التجربة. تحديد القيم هو الأساس.', User: { id: 10, name: 'عمر السالم' } },
    { id: 2, postId: 1, content: 'ممتاز، ما رأيك في الهوية البصرية؟ هل تبدأ بها قبل أو بعد تحديد القيم؟', User: { id: 11, name: 'ريم العلي' } },
    { id: 3, postId: 1, content: 'شكراً على المشاركة! هل يمكنك التوسع في نقطة التمايز؟', User: { id: 12, name: 'محمد الجابر' } }
  ],
  2: [
    { id: 4, postId: 2, content: 'هذا تماماً ما كنت أحتاج سماعه. شكراً على الصراحة!', User: { id: 13, name: 'حمد الدوسري' } },
    { id: 5, postId: 2, content: '٢٠ مقابلة قبل البناء، هذا الدرس الأهم في ريادة الأعمال.', User: { id: 14, name: 'لطيفة الكعبي' } }
  ],
  5: [
    { id: 6, postId: 5, content: 'جرب HubSpot Free أولاً، مجاني وكافي لـ١٢٠ عميل.', User: { id: 15, name: 'عبدالله الرشيدي' } },
    { id: 7, postId: 5, content: 'Notion CRM ممتاز لو تحب المرونة، لكن يحتاج إعداد.', User: { id: 16, name: 'دلال المطيري' } },
    { id: 8, postId: 5, content: 'Zoho CRM خيار ممتاز بالسعر المناسب!', User: { id: 17, name: 'وليد الشهري' } }
  ]
};

const ACTIVE_MEMBERS = [
  { name: 'منال الزهراني', posts: 34 },
  { name: 'سارة المنصوري', posts: 27 },
  { name: 'خالد الحربي', posts: 19 },
  { name: 'أحمد الشمري', posts: 15 },
  { name: 'نورة القحطاني', posts: 12 }
];

@Component({
  selector: 'app-community',
  imports: [CommonModule, SideBar, FormsModule],
  templateUrl: './community.html',
  styleUrl: './community.css',
  standalone: true
})
export class Community implements OnInit, OnDestroy {

  // ── Sidebar Reference ──
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  isLoading = false;
  isCreatingPost = false;
  errorMessage = '';
  successMessage = '';

  currentUser: any = { id: 1, name: 'أنت' };

  summaryCards: SummaryCard[] = [
    { title: 'المشاركات', value: 0, icon: '📝', color: 'blue', loading: false },
    { title: 'الأعضاء النشطين', value: 0, icon: '👥', color: 'green', loading: false },
    { title: 'التفاعلات', value: 0, icon: '❤️', color: 'orange', loading: false }
  ];

  allPosts: PostWithDetails[] = [];
  posts: PostWithDetails[] = [];
  topTopics: TopicItem[] = [];
  activeMembers = ACTIVE_MEMBERS;

  selectedFilter: string = 'all';
  searchQuery: string = '';
  availableFilters = [
    { value: 'all', label: 'الكل', icon: '📋' },
    { value: 'popular', label: 'الأكثر شعبية', icon: '🔥' },
    { value: 'recent', label: 'الأحدث', icon: '🆕' },
    { value: 'my-posts', label: 'منشوراتي', icon: '👤' }
  ];

  availableTags = ['تسويق', 'مبيعات', 'إدارة', 'تقنية', 'تمويل', 'استراتيجية', 'نصائح', 'أسئلة'];

  newPost = { title: '', content: '', tags: [] as string[] };
  showNewPostModal = false;
  newCommentContent: { [postId: number]: string } = {};
  showGuide = false;
  isSidebarCollapsed = false;

  ngOnInit(): void {
    this.loadMockData();
  }

  ngOnDestroy(): void {}

  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  /** يفتح الـ sidebar على موبايل/تابلت */
  openSidebar() {
    this.sidebarComponent?.openMobile();
  }

  loadMockData() {
    this.allPosts = JSON.parse(JSON.stringify(MOCK_POSTS));
    this.posts = [...this.allPosts];
    const totalLikes = this.allPosts.reduce((s, p) => s + (p.likesCount || 0), 0);
    this.summaryCards[0].value = this.allPosts.length;
    this.summaryCards[1].value = ACTIVE_MEMBERS.length;
    this.summaryCards[2].value = totalLikes;
    this.computeTopics();
  }

  computeTopics() {
    const counts: { [k: string]: number } = {};
    this.allPosts.forEach(p => (p.tags || []).forEach(t => counts[t] = (counts[t] || 0) + 1));
    this.topTopics = Object.entries(counts)
      .map(([name, posts]) => ({ name, posts }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);
  }

  applyFilters() {
    let filtered = [...this.allPosts];
    if (this.selectedFilter === 'popular') {
      filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (this.selectedFilter === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (this.selectedFilter === 'my-posts') {
      filtered = filtered.filter(p => p.userId === this.currentUser?.id);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.author?.toLowerCase().includes(q)
      );
    }
    this.posts = filtered;
  }

  changeFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  filterByTag(tag: string) {
    this.searchQuery = tag;
    this.selectedFilter = 'all';
    this.applyFilters();
  }

  searchPosts() {
    this.applyFilters();
  }

  toggleLike(post: PostWithDetails) {
    post.isLiked = !post.isLiked;
    post.likesCount = (post.likesCount || 0) + (post.isLiked ? 1 : -1);
    const totalLikes = this.allPosts.reduce((s, p) => s + (p.likesCount || 0), 0);
    this.summaryCards[2].value = totalLikes;
  }

  toggleComments(post: PostWithDetails) {
    post.showComments = !post.showComments;
    if (post.showComments && (!post.comments || post.comments.length === 0)) {
      post.loadingComments = true;
      setTimeout(() => {
        post.comments = MOCK_COMMENTS[post.id!] || [];
        post.loadingComments = false;
      }, 400);
    }
  }

  addComment(post: PostWithDetails) {
    if (!post.id) return;
    const content = this.newCommentContent[post.id];
    if (!content?.trim()) { this.showError('الرجاء كتابة تعليق'); return; }
    if (!post.comments) post.comments = [];
    post.comments.unshift({
      id: Date.now(), postId: post.id!,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      User: { id: 1, name: 'أنت' }
    });
    post.commentsCount = (post.commentsCount || 0) + 1;
    this.newCommentContent[post.id!] = '';
    this.showSuccess('تم إضافة التعليق بنجاح');
  }

  openNewPostModal() {
    this.showNewPostModal = true;
    this.newPost = { title: '', content: '', tags: [] };
  }

  closeNewPostModal() {
    this.showNewPostModal = false;
    this.newPost = { title: '', content: '', tags: [] };
  }

  toggleTag(tag: string) {
    const i = this.newPost.tags.indexOf(tag);
    if (i > -1) this.newPost.tags.splice(i, 1); else this.newPost.tags.push(tag);
  }

  createPost() {
    if (!this.newPost.title.trim()) { this.showError('الرجاء إدخال عنوان المنشور'); return; }
    if (!this.newPost.content.trim()) { this.showError('الرجاء إدخال محتوى المنشور'); return; }
    this.isCreatingPost = true;
    setTimeout(() => {
      const newPost: PostWithDetails = {
        id: Date.now(), userId: 1,
        title: this.newPost.title.trim(),
        content: this.newPost.content.trim(),
        tags: [...this.newPost.tags],
        likesCount: 0,
        createdAt: new Date().toISOString(),
        author: 'أنت', authorRole: 'عضو جديد', timeAgo: 'الآن',
        commentsCount: 0, isLiked: false, showComments: false, comments: [], loadingComments: false
      };
      this.allPosts.unshift(newPost);
      this.summaryCards[0].value = this.allPosts.length;
      this.computeTopics();
      this.applyFilters();
      this.isCreatingPost = false;
      this.closeNewPostModal();
      this.showSuccess('تم نشر المنشور بنجاح!');
    }, 600);
  }

  deletePost(post: PostWithDetails) {
    if (!post.id) return;
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    this.allPosts = this.allPosts.filter(p => p.id !== post.id);
    this.summaryCards[0].value = this.allPosts.length;
    this.computeTopics();
    this.applyFilters();
    this.showSuccess('تم حذف المنشور بنجاح');
  }

  isMyPost(post: PostWithDetails): boolean {
    return post.userId === this.currentUser?.id;
  }

  openGuide() { this.showGuide = true; }
  closeGuide() { this.showGuide = false; }

  showSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => this.successMessage = '', 3000);
  }

  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 3000);
  }
}