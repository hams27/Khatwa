import { Component, OnInit, OnDestroy } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityService, CommunityPost, Comment } from '../services/community';
import { AuthService } from '../services/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

// Extended Interfaces
interface PostWithDetails extends CommunityPost {
  author?: string;
  authorRole?: string;
  timeAgo?: string;
  commentsCount?: number;
  isLiked?: boolean;
  showComments?: boolean;
  comments?: Comment[];
  loadingComments?: boolean;
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

@Component({
  selector: 'app-community',
  imports: [CommonModule, SideBar, FormsModule],
  templateUrl: './community.html',
  styleUrl: './community.css',
  standalone: true
})
export class Community implements OnInit, OnDestroy {
  
  // Loading & Error States
  isLoading = false;
  isCreatingPost = false;
  errorMessage = '';
  successMessage = '';
  
  // Current User
  currentUser: any = null;
  
  // Summary cards (Dynamic)
  summaryCards: SummaryCard[] = [
    { title: 'المشاركات', value: 0, icon: '📝', color: 'blue', loading: true },
    { title: 'الأعضاء النشطين', value: 0, icon: '👥', color: 'green', loading: true },
    { title: 'التفاعلات', value: 0, icon: '❤️', color: 'orange', loading: true }
  ];

  // Posts (Dynamic from Backend)
  posts: PostWithDetails[] = [];
  
  // Filters
  selectedFilter: string = 'all';
  searchQuery: string = '';
  availableFilters = [
    { value: 'all', label: 'الكل', icon: '📋' },
    { value: 'popular', label: 'الأكثر شعبية', icon: '🔥' },
    { value: 'recent', label: 'الأحدث', icon: '🆕' },
    { value: 'my-posts', label: 'منشوراتي', icon: '👤' }
  ];

  // Top Topics (Dynamic)
  topTopics: TopicItem[] = [];
  
  // Available Tags
  availableTags = [
    'تسويق',
    'مبيعات',
    'إدارة',
    'تقنية',
    'تمويل',
    'استراتيجية',
    'نصائح',
    'أسئلة'
  ];

  // New Post Form
  newPost = {
    title: '',
    content: '',
    tags: [] as string[]
  };
  showNewPostModal = false;
  
  // New Comment
  newCommentContent: { [postId: number]: string } = {};

  // Guide popup toggle
  showGuide = false;
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  autoRefreshEnabled = false;
  
  // Pagination
  currentPage = 1;
  postsPerPage = 10;
  hasMorePosts = false;

  constructor(
    private communityService: CommunityService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('💬 Community Component Initialized');
    this.loadCurrentUser();
    this.loadCommunityData();
  }
  
  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // Load Current User
  loadCurrentUser() {
    this.currentUser = this.authService.currentUserValue;
  }

  // Load Community Data
  loadCommunityData() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Load posts
    this.loadPosts();
    
    // Load statistics
    this.loadStatistics();
    
    // Load top topics
    this.loadTopTopics();
  }

  // Load Posts
  loadPosts() {
    const tag = this.selectedFilter !== 'all' && this.selectedFilter !== 'popular' && this.selectedFilter !== 'recent' && this.selectedFilter !== 'my-posts' 
      ? this.selectedFilter 
      : undefined;
    
    this.communityService.getPosts(tag).subscribe({
      next: (response: any) => {
        console.log('📝 Posts loaded:', response);
        
        if (response && response.data) {
          this.posts = response.data.map((post: CommunityPost) => ({
            ...post,
            author: post.User?.name || 'مستخدم',
            authorRole: 'عضو',
            timeAgo: this.getRelativeTime(post.createdAt || ''),
            commentsCount: 0, // يمكن إضافتها من الـ API
            isLiked: false, // يمكن إضافتها من الـ API
            showComments: false,
            comments: [],
            loadingComments: false
          }));
          
          // Apply filters
          this.applyFilters();
          
          // Update summary
          this.summaryCards[0].value = this.posts.length;
          this.summaryCards[0].loading = false;
        }
        
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading posts:', error);
        this.errorMessage = 'حدث خطأ في تحميل المنشورات';
        this.isLoading = false;
        this.summaryCards.forEach(card => card.loading = false);
      }
    });
  }

  // Apply Filters
  applyFilters() {
    let filteredPosts = [...this.posts];
    
    // Filter by type
    if (this.selectedFilter === 'popular') {
      filteredPosts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (this.selectedFilter === 'recent') {
      filteredPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    } else if (this.selectedFilter === 'my-posts') {
      filteredPosts = filteredPosts.filter(post => post.userId === this.currentUser?.id);
    }
    
    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        post.title?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.author?.toLowerCase().includes(query)
      );
    }
    
    this.posts = filteredPosts;
  }

  // Load Statistics
  loadStatistics() {
    // For now, calculate from posts
    // In the future, this can come from a dedicated API endpoint
    const totalLikes = this.posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
    
    this.summaryCards[1].value = this.getUniqueAuthorsCount();
    this.summaryCards[1].loading = false;
    
    this.summaryCards[2].value = totalLikes;
    this.summaryCards[2].loading = false;
  }

  // Get unique authors count
  getUniqueAuthorsCount(): number {
    const uniqueAuthors = new Set(this.posts.map(post => post.userId));
    return uniqueAuthors.size;
  }

  // Load Top Topics
  loadTopTopics() {
    // Calculate from posts tags
    const tagCounts: { [key: string]: number } = {};
    
    this.posts.forEach(post => {
      if (post.tags && post.tags.length > 0) {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    this.topTopics = Object.entries(tagCounts)
      .map(([name, posts]) => ({ name, posts }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);
  }

  // Toggle Like
  toggleLike(post: PostWithDetails) {
    if (!post.id) return;
    
    this.communityService.toggleLike(post.id).subscribe({
      next: (response: any) => {
        console.log('👍 Like toggled:', response);
        
        // Update UI
        post.isLiked = !post.isLiked;
        if (post.isLiked) {
          post.likesCount = (post.likesCount || 0) + 1;
        } else {
          post.likesCount = Math.max((post.likesCount || 0) - 1, 0);
        }
        
        // Update statistics
        this.loadStatistics();
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error toggling like:', error);
        this.showError('حدث خطأ في الإعجاب');
      }
    });
  }

  // Toggle Comments
  toggleComments(post: PostWithDetails) {
    if (!post.id) return;
    
    post.showComments = !post.showComments;
    
    if (post.showComments && (!post.comments || post.comments.length === 0)) {
      this.loadComments(post);
    }
  }

  // Load Comments
  loadComments(post: PostWithDetails) {
    if (!post.id) return;
    
    post.loadingComments = true;
    
    this.communityService.getComments(post.id).subscribe({
      next: (response: any) => {
        console.log('💬 Comments loaded:', response);
        
        if (response && response.data) {
          post.comments = response.data;
          post.commentsCount = response.data.length;
        }
        
        post.loadingComments = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading comments:', error);
        post.loadingComments = false;
      }
    });
  }

  // Add Comment
  addComment(post: PostWithDetails) {
    if (!post.id) return;
    
    const content = this.newCommentContent[post.id];
    if (!content || !content.trim()) {
      this.showError('الرجاء كتابة تعليق');
      return;
    }
    
    this.communityService.addComment(post.id, content.trim()).subscribe({
      next: (response: any) => {
        console.log('✅ Comment added:', response);
        
        // Add comment to list
        if (!post.comments) {
          post.comments = [];
        }
        
        post.comments.unshift({
          id: response.data?.id,
          postId: post.id!,
          content: content.trim(),
          createdAt: new Date().toISOString(),
          User: {
            id: this.currentUser?.id,
            name: this.currentUser?.name || 'أنت'
          }
        });
        
        post.commentsCount = (post.commentsCount || 0) + 1;
        
        // Clear input
        this.newCommentContent[post.id!] = '';
        
        this.showSuccess('تم إضافة التعليق بنجاح');
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error adding comment:', error);
        this.showError('حدث خطأ في إضافة التعليق');
      }
    });
  }

  // Open New Post Modal
  openNewPostModal() {
    this.showNewPostModal = true;
    this.newPost = {
      title: '',
      content: '',
      tags: []
    };
  }

  // Close New Post Modal
  closeNewPostModal() {
    this.showNewPostModal = false;
    this.newPost = {
      title: '',
      content: '',
      tags: []
    };
  }

  // Toggle Tag Selection
  toggleTag(tag: string) {
    const index = this.newPost.tags.indexOf(tag);
    if (index > -1) {
      this.newPost.tags.splice(index, 1);
    } else {
      this.newPost.tags.push(tag);
    }
  }

  // Create Post
  createPost() {
    // Validation
    if (!this.newPost.title.trim()) {
      this.showError('الرجاء إدخال عنوان المنشور');
      return;
    }
    
    if (!this.newPost.content.trim()) {
      this.showError('الرجاء إدخال محتوى المنشور');
      return;
    }
    
    this.isCreatingPost = true;
    
    const postData: CommunityPost = {
      title: this.newPost.title.trim(),
      content: this.newPost.content.trim(),
      tags: this.newPost.tags
    };
    
    this.communityService.createPost(postData).subscribe({
      next: (response: any) => {
        console.log('✅ Post created:', response);
        
        this.showSuccess('تم نشر المنشور بنجاح');
        this.closeNewPostModal();
        
        // Reload posts
        this.loadPosts();
        
        this.isCreatingPost = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error creating post:', error);
        this.showError('حدث خطأ في نشر المنشور');
        this.isCreatingPost = false;
      }
    });
  }

  // Delete Post
  deletePost(post: PostWithDetails) {
    if (!post.id) return;
    
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
      return;
    }
    
    this.communityService.deletePost(post.id).subscribe({
      next: (response: any) => {
        console.log('🗑️ Post deleted:', response);
        
        // Remove from list
        this.posts = this.posts.filter(p => p.id !== post.id);
        
        this.showSuccess('تم حذف المنشور بنجاح');
        
        // Update statistics
        this.loadStatistics();
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error deleting post:', error);
        this.showError('حدث خطأ في حذف المنشور');
      }
    });
  }

  // Filter by Tag
  filterByTag(tag: string) {
    this.selectedFilter = tag;
    this.loadPosts();
  }

  // Change Filter
  changeFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  // Search Posts
  searchPosts() {
    this.applyFilters();
  }

  // Refresh Data
  refreshCommunity() {
    this.loadCommunityData();
  }

  // Toggle Auto Refresh
  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(2 * 60 * 1000).subscribe(() => {
        console.log('🔄 Auto-refreshing community data');
        this.loadPosts();
      });
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }
    }
  }

  // Utility: Get Relative Time
  getRelativeTime(dateString: string): string {
    if (!dateString) return 'الآن';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `قبل ${diffInMinutes} ${diffInMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
    } else if (diffInHours < 24) {
      return `قبل ${diffInHours} ${diffInHours === 1 ? 'ساعة' : 'ساعات'}`;
    } else if (diffInDays === 1) {
      return 'أمس';
    } else if (diffInDays < 7) {
      return `قبل ${diffInDays} أيام`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `قبل ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `قبل ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    }
  }

  // Check if post is owned by current user
  isMyPost(post: PostWithDetails): boolean {
    return post.userId === this.currentUser?.id;
  }

  // Show Success Message
  showSuccess(message: string) {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  // Show Error Message
  showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  // Guide functions
  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }
}