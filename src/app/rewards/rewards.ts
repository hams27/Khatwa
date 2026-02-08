import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';


interface Goal {
  id: number;
  title: string;
  progress: number;
  target: number;
  points: number;
  icon: string;
  completed: boolean;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  points: number;
  icon: string;
  iconBg: string;
  timeAgo: string;
}

interface Activity {
  id: number;
  title: string;
  points: number;
  timeAgo: string;
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
}

@Component({
  selector: 'app-rewards',
  imports: [CommonModule,SideBar],
  templateUrl: './rewards.html',
  styleUrl: './rewards.css',
})
export class Rewards implements OnInit{

 // User Points Data
  totalPoints: number = 1450;
  currentLevel: number = 3;
  levelName: string = 'محترف';
  pointsToNextLevel: number = 550;
  levelProgress: number = 72.5;
  maxLevelPoints: number = 2000;

  // Weekly Goals
  weeklyGoals: Goal[] = [
    {
      id: 1,
      title: 'أضف 3 منشورات تسويقية',
      progress: 2,
      target: 3,
      points: 50,
      icon: '🎯',
      completed: false
    },
    {
      id: 2,
      title: 'حدّث ميزانيتك المالية',
      progress: 1,
      target: 1,
      points: 30,
      icon: '✓',
      completed: true
    }
  ];

  // Achievements
  achievements: Achievement[] = [
    {
      id: 1,
      title: 'البداية القوية',
      description: 'أكملت إعداد حسابك بالكامل',
      points: 100,
      icon: '⭐',
      iconBg: 'expert',
      timeAgo: 'منذ 15 يوم'
    },
    {
      id: 2,
      title: 'رائد تسويقي',
      description: 'أطلقت 10 حملات تسويقية',
      points: 200,
      icon: '📈',
      iconBg: 'growth',
      timeAgo: 'منذ 5 أيام'
    },
    {
      id: 3,
      title: 'منظم محترف',
      description: 'أكملت 50 مهمة',
      points: 150,
      icon: '✓',
      iconBg: 'check',
      timeAgo: 'منذ 3 أيام'
    }
  ];

  // Recent Activities
  recentActivities: Activity[] = [
    {
      id: 1,
      title: 'أكملت مهمة',
      points: 20,
      timeAgo: 'منذ ساعة'
    },
    {
      id: 2,
      title: 'حصلت على إنجاز جديد',
      points: 200,
      timeAgo: 'منذ 3 ساعات'
    },
    {
      id: 3,
      title: 'أضفت منشور تسويقي',
      points: 15,
      timeAgo: 'أمس'
    }
  ];

  // Milestones
  milestones: Milestone[] = [
    {
      id: 1,
      title: 'خبير مالي',
      description: 'حافظت على ميزانية متوازنة لمدة شهر',
      progress: 75,
      points: 300,
      icon: '🎖️'
    },
    {
      id: 2,
      title: 'مؤثر اجتماعي',
      description: 'حصلت على 100 إعجاب في المجتمع',
      progress: 45,
      points: 250,
      icon: '👑'
    }
  ];

  // Rewards Store
  rewards: Reward[] = [
    {
      id: 1,
      title: 'استشارة مجانية مع خبير',
      description: 'جلسة استشارية لمدة ساعة',
      points: 500,
      icon: '🎁',
      available: true
    },
    {
      id: 2,
      title: 'قالب تصميم احترافي',
      description: '10 قوالب جاهزة للسوشيال ميديا',
      points: 300,
      icon: '🎁',
      available: true
    },
    {
      id: 3,
      title: 'كوبون خصم 20%',
      description: 'خصم على الاشتراك الشهري',
      points: 400,
      icon: '🎁',
      available: true
    },
    {
      id: 4,
      title: 'دورة تدريبية مميزة',
      description: 'اختر أي دورة من المكتبة',
      points: 800,
      icon: '🎁',
      available: false
    }
  ];

  constructor() { }

  ngOnInit(): void {
    this.calculateProgress();
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
    if (this.canRedeemReward(reward)) {
      this.totalPoints -= reward.points;
      alert(`تم استبدال ${reward.title} بنجاح!`);
      // Here you would typically call a service to handle the redemption
      this.updateLevelProgress();
    } else if (!reward.available) {
      alert('هذه المكافأة غير متاحة حالياً');
    } else {
      alert('ليس لديك نقاط كافية لاستبدال هذه المكافأة');
    }
  }

  // Update level progress
  updateLevelProgress(): void {
    this.levelProgress = (this.totalPoints / this.maxLevelPoints) * 100;
    this.pointsToNextLevel = this.maxLevelPoints - this.totalPoints;
    
    // Check if user leveled up
    if (this.totalPoints >= this.maxLevelPoints) {
      this.levelUp();
    }
  }

  // Level up function
  levelUp(): void {
    this.currentLevel++;
    this.totalPoints = this.totalPoints - this.maxLevelPoints;
    this.maxLevelPoints = Math.floor(this.maxLevelPoints * 1.5); // Increase points needed for next level
    this.updateLevelProgress();
    alert(`مبروك! وصلت للمستوى ${this.currentLevel}`);
  }

  // Complete a goal
  completeGoal(goal: Goal): void {
    if (!goal.completed && goal.progress >= goal.target) {
      goal.completed = true;
      this.totalPoints += goal.points;
      this.updateLevelProgress();
      alert(`مبروك! لقد أكملت هدف "${goal.title}" وحصلت على ${goal.points} نقطة`);
    }
  }

  // Get display for goal progress
  getGoalProgressDisplay(goal: Goal): string {
    return `${goal.progress} / ${goal.target}`;
  }

  // Get level progress display
  getLevelProgressDisplay(): string {
    return `${this.totalPoints} / ${this.maxLevelPoints}`;
  }

}
