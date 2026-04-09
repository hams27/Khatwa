import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { interval, Subscription } from 'rxjs';
import { API_BASE_URL } from '../config/api';

// Interfaces
interface Goal {
  id: number;
  title: string;
  progress: number;
  target: number;
  points: number;
  icon: string;
  completed: boolean;
  type?: string;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  points: number;
  icon: string;
  iconBg: string;
  timeAgo: string;
  type?: string;
  unlockedAt?: string;
}

interface Activity {
  id: number;
  title: string;
  points: number;
  timeAgo: string;
  type?: string;
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  progress: number;
  points: number;
  icon: string;
}

interface Reward {
  id: number;
  title: string;
  description: string;
  points: number;
  icon: string;
  available: boolean;
  category?: string;
}

interface UserRewardsData {
  points: number;
  level: number;
  totalEarned: number;
  achievements: Achievement[];
}

@Component({
  selector: 'app-rewards',
  imports: [CommonModule, SideBar],
  templateUrl: './rewards.html',
  styleUrl: './rewards.css',
  standalone: true
})
export class Rewards implements OnInit, OnDestroy {
  
  // Loading & Error States
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // User Info
  currentUser: any = null;
  userId: number = 0;
  
  // User Points Data (Dynamic from Backend)
  totalPoints: number = 0;
  currentLevel: number = 1;
  levelName: string = 'مبتدئ';
  pointsToNextLevel: number = 100;
  levelProgress: number = 0;
  maxLevelPoints: number = 100;
  totalEarned: number = 0;

  // Weekly Goals (Dynamic)
  weeklyGoals: Goal[] = [];

  // Achievements (Dynamic from Backend)
  achievements: Achievement[] = [];

  // Recent Activities (Dynamic)
  recentActivities: Activity[] = [];

  // Milestones (Dynamic)
  milestones: Milestone[] = [];

  // Rewards Store
  rewards: Reward[] = [
    {
      id: 1,
      title: 'استشارة مجانية مع خبير',
      description: 'جلسة استشارية لمدة ساعة',
      points: 500,
      icon: '💼',
      available: true,
      category: 'consultation'
    },
    {
      id: 2,
      title: 'قالب تصميم احترافي',
      description: '10 قوالب جاهزة للسوشيال ميديا',
      points: 300,
      icon: '🎨',
      available: true,
      category: 'templates'
    },
    {
      id: 3,
      title: 'كوبون خصم 20%',
      description: 'خصم على الاشتراك الشهري',
      points: 400,
      icon: '🎟️',
      available: true,
      category: 'discount'
    },
    {
      id: 4,
      title: 'دورة تدريبية مميزة',
      description: 'اختر أي دورة من المكتبة',
      points: 800,
      icon: '📚',
      available: true,
      category: 'course'
    },
    {
      id: 5,
      title: 'تحليل مشروع مجاني',
      description: 'تحليل شامل لمشروعك من خبير',
      points: 600,
      icon: '📊',
      available: true,
      category: 'analysis'
    },
    {
      id: 6,
      title: 'شهادة إنجاز',
      description: 'شهادة معتمدة بإنجازاتك',
      points: 1000,
      icon: '🏆',
      available: true,
      category: 'certificate'
    }
  ];
  
  // Available Achievements (الإنجازات المتاحة)
  availableAchievements = [
    {
      type: 'first_project',
      title: 'المشروع الأول',
      description: 'أنشأت مشروعك الأول',
      points: 50,
      icon: '🚀',
      iconBg: 'blue'
    },
    {
      type: 'complete_onboarding',
      title: 'بداية قوية',
      description: 'أكملت خطوات الإعداد الأولية',
      points: 30,
      icon: '✅',
      iconBg: 'green'
    },
    {
      type: 'complete_10_tasks',
      title: 'منجز المهام',
      description: 'أنجزت 10 مهام',
      points: 75,
      icon: '📋',
      iconBg: 'purple'
    },
    {
      type: 'first_marketing_plan',
      title: 'استراتيجي تسويقي',
      description: 'أنشأت أول خطة تسويقية',
      points: 100,
      icon: '📈',
      iconBg: 'orange'
    },
    {
      type: 'reach_revenue_goal',
      title: 'هدف الإيرادات',
      description: 'حققت هدف الإيرادات الشهري',
      points: 150,
      icon: '💰',
      iconBg: 'gold'
    },
    {
      type: 'invite_team_member',
      title: 'بناء الفريق',
      description: 'أضفت أول عضو للفريق',
      points: 40,
      icon: '👥',
      iconBg: 'cyan'
    },
    {
      type: 'monthly_streak',
      title: 'الالتزام الشهري',
      description: 'استخدمت المنصة يومياً لمدة شهر',
      points: 200,
      icon: '🔥',
      iconBg: 'red'
    }
  ];
  
  // Level Names
  levelNames = [
    'مبتدئ',      // Level 1 (0-99)
    'متقدم',      // Level 2 (100-299)
    'محترف',      // Level 3 (300-599)
    'خبير',       // Level 4 (600-999)
    'أسطورة'      // Level 5 (1000+)
  ];
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  
  // API URL
  private apiUrl = API_BASE_URL;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('🏆 Rewards Component Initialized');
    this.loadUserData();
    this.loadRewardsData();
    this.setupAutoRefresh();
  }
  
  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // Load User Data
  loadUserData() {
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser && this.currentUser.id) {
      this.userId = this.currentUser.id;
    }
  }

  // Load Rewards Data from Backend
  loadRewardsData() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get(`${this.apiUrl}/rewards/user`).subscribe({
      next: (response: any) => {
        console.log('🎁 Rewards data loaded:', response);
        
        if (response && response.data) {
          const data: UserRewardsData = response.data;
          
          // Update user points
          this.totalPoints = data.points || 0;
          this.totalEarned = data.totalEarned || 0;
          
          // Calculate level
          this.calculateLevel();
          
          // Load achievements
          if (data.achievements && data.achievements.length > 0) {
            this.achievements = data.achievements.map(a => ({
              ...a,
              timeAgo: this.getRelativeTime(a.unlockedAt || ''),
              iconBg: this.getAchievementIconBg(a.type || '')
            }));
          }
          
          // Generate weekly goals
          this.generateWeeklyGoals();
          
          // Generate milestones
          this.generateMilestones();
          
          // Generate recent activities
          this.generateRecentActivities();
        }
        
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading rewards:', error);
        
        if (error.status === 404 || error.status === 0) {
          // User doesn't have rewards data yet - create initial state
          console.log('ℹ️ No rewards data found, using defaults');
          this.initializeDefaultRewards();
        } else {
          this.errorMessage = 'حدث خطأ في تحميل بيانات المكافآت';
        }
        
        this.isLoading = false;
      }
    });
  }

  // Initialize default rewards for new users
  initializeDefaultRewards() {
    this.totalPoints = 0;
    this.totalEarned = 0;
    this.currentLevel = 1;
    this.levelName = 'مبتدئ';
    this.calculateLevel();
    this.generateWeeklyGoals();
    this.generateMilestones();
  }

  // Calculate level based on total earned points
  calculateLevel() {
    const earned = this.totalEarned;
    
    if (earned < 100) {
      this.currentLevel = 1;
      this.maxLevelPoints = 100;
    } else if (earned < 300) {
      this.currentLevel = 2;
      this.maxLevelPoints = 300;
    } else if (earned < 600) {
      this.currentLevel = 3;
      this.maxLevelPoints = 600;
    } else if (earned < 1000) {
      this.currentLevel = 4;
      this.maxLevelPoints = 1000;
    } else {
      this.currentLevel = 5;
      this.maxLevelPoints = 2000;
    }
    
    this.levelName = this.levelNames[this.currentLevel - 1] || 'مبتدئ';
    this.pointsToNextLevel = this.maxLevelPoints - this.totalEarned;
    this.levelProgress = (this.totalEarned / this.maxLevelPoints) * 100;
  }

  // Generate Weekly Goals (Dynamic based on user activity)
  generateWeeklyGoals() {
    this.weeklyGoals = [
      {
        id: 1,
        title: 'أضف 3 سجلات مالية',
        progress: 0, // يمكن تحديثها من الـ Backend
        target: 3,
        points: 30,
        icon: '💰',
        completed: false,
        type: 'financial'
      },
      {
        id: 2,
        title: 'أنجز 5 مهام',
        progress: 0,
        target: 5,
        points: 50,
        icon: '✅',
        completed: false,
        type: 'tasks'
      },
      {
        id: 3,
        title: 'أضف عضو جديد للفريق',
        progress: 0,
        target: 1,
        points: 40,
        icon: '👥',
        completed: false,
        type: 'team'
      }
    ];
  }

  // Generate Milestones
  generateMilestones() {
    this.milestones = [
      {
        id: 1,
        title: 'خبير مالي',
        description: 'حافظ على ميزانية متوازنة لمدة شهر',
        progress: 0, // يمكن حسابها من البيانات المالية
        points: 300,
        icon: '🎖️'
      },
      {
        id: 2,
        title: 'مؤثر اجتماعي',
        description: 'احصل على 100 إعجاب في المجتمع',
        progress: 0,
        points: 250,
        icon: '👑'
      },
      {
        id: 3,
        title: 'قائد الفريق',
        description: 'أضف 10 أعضاء للفريق',
        progress: 0,
        points: 400,
        icon: '🏅'
      }
    ];
  }

  // Generate Recent Activities
  generateRecentActivities() {
    // آخر 3 إنجازات
    this.recentActivities = this.achievements.slice(0, 3).map(a => ({
      id: a.id,
      title: `حصلت على "${a.title}"`,
      points: a.points,
      timeAgo: a.timeAgo,
      type: 'achievement'
    }));
  }

  // Get Achievement Icon Background
  getAchievementIconBg(type: string): string {
    const achievement = this.availableAchievements.find(a => a.type === type);
    return achievement?.iconBg || 'blue';
  }

  // Calculate progress percentage for goals
  calculateProgress(): void {
    this.weeklyGoals.forEach(goal => {
      goal.progress = Math.min(goal.progress, goal.target);
    });
  }

  // Get progress percentage for a goal
  getGoalProgress(goal: Goal): number {
    return (goal.progress / goal.target) * 100;
  }

  // Check if user can redeem a reward
  canRedeemReward(reward: Reward): boolean {
    return reward.available && this.totalPoints >= reward.points;
  }

  // Redeem a reward
  redeemReward(reward: Reward): void {
    if (!this.canRedeemReward(reward)) {
      if (!reward.available) {
        this.errorMessage = 'هذه المكافأة غير متاحة حالياً';
      } else {
        this.errorMessage = `تحتاج إلى ${reward.points - this.totalPoints} نقطة إضافية`;
      }
      
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
      
      return;
    }
    
    if (!confirm(`هل تريد استبدال ${reward.points} نقطة للحصول على "${reward.title}"؟`)) {
      return;
    }
    
    // Call API to redeem reward
    this.http.post(`${this.apiUrl}/rewards/redeem`, {
      rewardId: reward.id,
      points: reward.points
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Reward redeemed:', response);
        
        // Update points
        this.totalPoints -= reward.points;
        this.calculateLevel();
        
        this.successMessage = `تم استبدال "${reward.title}" بنجاح! 🎉`;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error redeeming reward:', error);
        this.errorMessage = 'حدث خطأ في استبدال المكافأة';
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);
      }
    });
  }

  // Complete a goal
  completeGoal(goal: Goal): void {
    if (!goal.completed && goal.progress >= goal.target) {
      goal.completed = true;
      this.totalPoints += goal.points;
      this.totalEarned += goal.points;
      this.calculateLevel();
      
      this.successMessage = `مبروك! أكملت "${goal.title}" وحصلت على ${goal.points} نقطة 🎉`;
      
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);
    }
  }

  // Get display for goal progress
  getGoalProgressDisplay(goal: Goal): string {
    return `${goal.progress} / ${goal.target}`;
  }

  // Get level progress display
  getLevelProgressDisplay(): string {
    return `${this.totalEarned} / ${this.maxLevelPoints}`;
  }

  // Refresh rewards data
  refreshRewards(): void {
    this.loadRewardsData();
  }

  // Setup auto-refresh every 5 minutes
  setupAutoRefresh(): void {
    this.refreshSubscription = interval(5 * 60 * 1000).subscribe(() => {
      console.log('🔄 Auto-refreshing rewards data');
      this.loadRewardsData();
    });
  }

  // Utility: Get relative time
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
      return `منذ ${diffInMinutes} ${diffInMinutes === 1 ? 'دقيقة' : 'دقائق'}`;
    } else if (diffInHours < 24) {
      return `منذ ${diffInHours} ${diffInHours === 1 ? 'ساعة' : 'ساعات'}`;
    } else if (diffInDays === 1) {
      return 'أمس';
    } else if (diffInDays < 7) {
      return `منذ ${diffInDays} أيام`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    }
  }

  // Get level badge color
  getLevelBadgeColor(): string {
    const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];
    return colors[this.currentLevel - 1] || '#3498db';
  }

  // Get level icon
  getLevelIcon(): string {
    const icons = ['🌱', '🌿', '🌳', '⭐', '🏆'];
    return icons[this.currentLevel - 1] || '🌱';
  }

  // Check if achievement is unlocked
  isAchievementUnlocked(type: string): boolean {
    return this.achievements.some(a => a.type === type);
  }

  // Get locked achievements
  getLockedAchievements(): any[] {
    return this.availableAchievements.filter(
      a => !this.isAchievementUnlocked(a.type)
    );
  }

  // Get milestone progress percentage
  getMilestoneProgress(milestone: Milestone): number {
    return milestone.progress;
  }
}