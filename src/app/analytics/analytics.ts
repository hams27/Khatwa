import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { ProjectService, Project } from '../services/project';
import { FinanceService } from '../services/finance';
import { TaskService } from '../services/task';
import { MarketingService } from '../services/marketing';
import { interval, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces
interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  loading?: boolean;
}

interface Insight {
  title: string;
  description: string;
  confidence: number;
  type: 'success' | 'info' | 'warning' | 'danger';
}

interface ChannelData {
  name: string;
  visitors: number;
  conversion: number;
  revenue?: number;
}

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, FormsModule, SideBar],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css'],
  standalone: true
})
export class Analytics implements OnInit, OnDestroy {
  // حالة التحميل والأخطاء
  isLoading = false;
  errorMessage = '';
  showGuide = false;
  
  // معلومات المشروع الحالي
  currentProject: Project | null = null;
  currentProjectId: number = 0;
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  autoRefreshEnabled = false;
  
  // Stats Cards - ديناميكية من الـ Backend
  statsCards: StatCard[] = [
    {
      title: 'إجمالي الإيرادات',
      value: '0 ر.س',
      change: '+0%',
      icon: '💰',
      color: 'blue',
      loading: true
    },
    {
      title: 'معدل إنجاز المهام',
      value: '0%',
      change: '+0%',
      icon: '🎯',
      color: 'green',
      loading: true
    },
    {
      title: 'المصروفات الشهرية',
      value: '0 ر.س',
      change: '+0%',
      icon: '📊',
      color: 'purple',
      loading: true
    },
    {
      title: 'صافي الربح',
      value: '0 ر.س',
      change: '+0%',
      icon: '📈',
      color: 'orange',
      loading: true
    },
  ];

  // Insights - ديناميكية بناءً على البيانات
  insights: Insight[] = [];

  // Channels data - للرسم البياني
  channels: ChannelData[] = [];
  
  // بيانات إضافية
  totalProjects = 0;
  activeProjects = 0;
  completionRate = 0;
  profitMargin = 0;
  
  // فترة التحليل
  analysisStartDate: Date;
  analysisEndDate: Date;

  constructor(
    private projectService: ProjectService,
    private financeService: FinanceService,
    private taskService: TaskService,
    private marketingService: MarketingService
  ) {
    // آخر 30 يوم
    this.analysisEndDate = new Date();
    this.analysisStartDate = new Date();
    this.analysisStartDate.setDate(this.analysisStartDate.getDate() - 30);
  }

  ngOnInit() {
    console.log('📊 Analytics Component Initialized');
    this.loadCurrentProject();
  }
  
  ngOnDestroy() {
    // إيقاف الـ auto-refresh
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // تحميل المشروع الحالي
  loadCurrentProject() {
    this.isLoading = true;
    
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        console.log('📦 Projects loaded:', response);
        
        if (response && response.data && response.data.length > 0) {
          this.currentProject = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          this.totalProjects = response.data.length;
          this.activeProjects = response.data.filter(
            (p: Project) => p.stage === 'execution' || p.stage === 'planning'
          ).length;
          
          // تحميل كل البيانات
          this.loadAllAnalytics();
        } else {
          this.handleNoProjects();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading projects:', error);
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading = false;
      }
    });
  }

  // تحميل كل البيانات التحليلية
  loadAllAnalytics() {
    console.log('🔄 Loading all analytics...');
    
    // تحميل البيانات بالتوازي
    Promise.all([
      this.loadFinancialAnalytics(),
      this.loadTasksAnalytics(),
      this.loadMarketingAnalytics()
    ]).then(() => {
      console.log('✅ All analytics loaded');
      this.generateInsights();
      this.isLoading = false;
    }).catch((error: any) => {
      console.error('❌ Error loading analytics:', error);
      this.isLoading = false;
    });
  }

  // تحميل البيانات المالية
  loadFinancialAnalytics(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.financeService.getSummary(this.currentProjectId).subscribe({
        next: (response: any) => {
          console.log('💰 Finance data:', response);
          
          if (response && response.data) {
            const data = response.data;
            
            // تحديث الكروت المالية
            this.statsCards[0].value = this.formatCurrency(data.totalRevenue || 0);
            this.statsCards[0].loading = false;
            
            this.statsCards[2].value = this.formatCurrency(data.totalExpenses || 0);
            this.statsCards[2].loading = false;
            
            this.statsCards[3].value = this.formatCurrency(data.profit || 0);
            this.statsCards[3].loading = false;
            
            // حساب نسب التغيير
            if (data.previousRevenue && data.previousRevenue > 0) {
              const revenueChange = ((data.totalRevenue - data.previousRevenue) / data.previousRevenue * 100);
              this.statsCards[0].change = this.formatChange(revenueChange);
            }
            
            if (data.previousExpenses && data.previousExpenses > 0) {
              const expensesChange = ((data.totalExpenses - data.previousExpenses) / data.previousExpenses * 100);
              this.statsCards[2].change = this.formatChange(expensesChange);
            }
            
            if (data.previousProfit !== undefined) {
              const profitChange = data.previousProfit !== 0 
                ? ((data.profit - data.previousProfit) / Math.abs(data.previousProfit) * 100)
                : (data.profit > 0 ? 100 : 0);
              this.statsCards[3].change = this.formatChange(profitChange);
            }
            
            // حفظ هامش الربح
            this.profitMargin = data.profitMargin || 0;
            
            // بيانات القنوات (إذا كانت متوفرة)
            if (data.channelsData) {
              this.channels = data.channelsData;
            }
          }
          
          resolve();
        },
        error: (error: HttpErrorResponse) => {
          console.error('❌ Error loading finance analytics:', error);
          this.statsCards[0].loading = false;
          this.statsCards[2].loading = false;
          this.statsCards[3].loading = false;
          reject(error);
        }
      });
    });
  }

  // تحميل بيانات المهام
  loadTasksAnalytics(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.taskService.getTasks(this.currentProjectId).subscribe({
        next: (response: any) => {
          console.log('📋 Tasks data:', response);
          
          if (response && response.data) {
            const tasks = response.data;
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
            
            if (totalTasks > 0) {
              this.completionRate = Math.round((completedTasks / totalTasks) * 100);
              this.statsCards[1].value = `${this.completionRate}%`;
              this.statsCards[1].loading = false;
              
              // حساب التغيير (مقارنة بالأسبوع الماضي - إذا كانت البيانات متوفرة)
              const lastWeekTasks = tasks.filter((t: any) => {
                const taskDate = new Date(t.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return taskDate >= weekAgo;
              });
              
              if (lastWeekTasks.length > 0) {
                const lastWeekCompleted = lastWeekTasks.filter((t: any) => t.status === 'done').length;
                const lastWeekRate = Math.round((lastWeekCompleted / lastWeekTasks.length) * 100);
                const change = this.completionRate - lastWeekRate;
                this.statsCards[1].change = this.formatChange(change);
              }
            } else {
              this.statsCards[1].value = '0%';
              this.statsCards[1].loading = false;
            }
          }
          
          resolve();
        },
        error: (error: HttpErrorResponse) => {
          console.error('❌ Error loading tasks analytics:', error);
          this.statsCards[1].loading = false;
          reject(error);
        }
      });
    });
  }

  // تحميل بيانات التسويق
  loadMarketingAnalytics(): Promise<void> {
    return new Promise((resolve) => {
      this.marketingService.getPlans(this.currentProjectId).subscribe({
        next: (response: any) => {
          console.log('📢 Marketing data:', response);
          
          // يمكن إضافة تحليلات تسويقية هنا لاحقاً
          // مثل: عدد الحملات، معدل التحويل، إلخ
          
          resolve();
        },
        error: (error: HttpErrorResponse) => {
          console.error('❌ Error loading marketing analytics:', error);
          resolve(); // نكمل حتى لو فشل التسويق
        }
      });
    });
  }

  // توليد Insights ذكية بناءً على البيانات
  generateInsights() {
    this.insights = [];
    
    const revenueValue = this.parseValue(this.statsCards[0].value);
    const expensesValue = this.parseValue(this.statsCards[2].value);
    const profitValue = this.parseValue(this.statsCards[3].value);
    
    // Insight 1: التوقع المالي
    if (profitValue > 0) {
      const monthlyProjection = profitValue * 3;
      const formattedProjection = this.formatCurrency(monthlyProjection);
      
      this.insights.push({
        title: 'توقع إيجابي للنمو',
        description: `بناءً على الأداء الحالي، من المتوقع تحقيق ${formattedProjection} خلال 3 أشهر القادمة`,
        confidence: 75,
        type: 'success'
      });
    } else if (profitValue < 0) {
      this.insights.push({
        title: 'تحذير: خسائر حالية',
        description: `المشروع يحقق خسائر بقيمة ${this.formatCurrency(Math.abs(profitValue))}. يُنصح بمراجعة الاستراتيجية المالية`,
        confidence: 90,
        type: 'danger'
      });
    }
    
    // Insight 2: تحليل المصروفات
    if (revenueValue > 0) {
      const expenseRatio = (expensesValue / revenueValue * 100);
      
      if (expenseRatio > 80) {
        this.insights.push({
          title: 'تنبيه: مصروفات مرتفعة جداً',
          description: `المصروفات تمثل ${expenseRatio.toFixed(1)}% من الإيرادات. يجب تقليل النفقات بشكل عاجل`,
          confidence: 85,
          type: 'danger'
        });
      } else if (expenseRatio > 70) {
        this.insights.push({
          title: 'انتبه: نسبة مصروفات مرتفعة',
          description: `المصروفات تمثل ${expenseRatio.toFixed(1)}% من الإيرادات. يُنصح بمراجعة النفقات غير الضرورية`,
          confidence: 80,
          type: 'warning'
        });
      } else if (expenseRatio < 50) {
        this.insights.push({
          title: 'إدارة مالية ممتازة',
          description: `المصروفات تحت السيطرة بنسبة ${expenseRatio.toFixed(1)}%. استمر على هذا النهج الجيد`,
          confidence: 85,
          type: 'success'
        });
      } else {
        this.insights.push({
          title: 'إدارة مالية جيدة',
          description: `المصروفات متوازنة (${expenseRatio.toFixed(1)}% من الإيرادات). الوضع مستقر`,
          confidence: 75,
          type: 'info'
        });
      }
    }
    
    // Insight 3: معدل إنجاز المهام
    if (this.completionRate > 80) {
      this.insights.push({
        title: 'أداء ممتاز في المهام',
        description: `معدل إنجاز مرتفع (${this.completionRate}%). الفريق يعمل بكفاءة عالية`,
        confidence: 80,
        type: 'success'
      });
    } else if (this.completionRate < 30) {
      this.insights.push({
        title: 'تحذير: تراكم المهام',
        description: `معدل إنجاز منخفض (${this.completionRate}%). يُنصح بمراجعة توزيع المهام وتحديد الأولويات`,
        confidence: 85,
        type: 'warning'
      });
    }
    
    // Insight 4: فرصة للنمو
    if (profitValue > 0 && this.profitMargin > 20) {
      this.insights.push({
        title: 'فرصة للتوسع',
        description: `هامش ربح ممتاز (${this.profitMargin.toFixed(1)}%). يمكن استثمار جزء من الأرباح في التسويق أو تطوير المنتج`,
        confidence: 70,
        type: 'info'
      });
    }
    
    // Insight 5: تحذير عدم وجود إيرادات
    if (revenueValue === 0) {
      this.insights.push({
        title: 'تنبيه: لا توجد إيرادات مسجلة',
        description: 'لم يتم تسجيل أي إيرادات حتى الآن. ابدأ بإضافة سجلات الإيرادات لمتابعة الأداء المالي',
        confidence: 95,
        type: 'warning'
      });
    }
    
    // ترتيب الـ Insights حسب الأهمية (confidence)
    this.insights.sort((a, b) => b.confidence - a.confidence);
    
    console.log('💡 Generated insights:', this.insights);
  }

  // تحديث البيانات
  refreshAnalytics() {
    console.log('🔄 Refreshing analytics...');
    this.isLoading = true;
    this.errorMessage = '';
    
    // إعادة تعيين حالة التحميل
    this.statsCards.forEach(card => card.loading = true);
    
    this.loadAllAnalytics();
  }

  // تفعيل/إيقاف التحديث التلقائي
  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      // تحديث كل 5 دقائق
      this.refreshSubscription = interval(5 * 60 * 1000).subscribe(() => {
        console.log('🔄 Auto-refresh triggered');
        this.refreshAnalytics();
      });
      console.log('✅ Auto-refresh enabled (every 5 minutes)');
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
        console.log('❌ Auto-refresh disabled');
      }
    }
  }

  // معالجة عدم وجود مشاريع
  handleNoProjects() {
    this.isLoading = false;
    this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
    
    // إضافة insight تحفيزي
    this.insights.push({
      title: 'ابدأ رحلتك الآن',
      description: 'أنشئ مشروعك الأول وابدأ في تتبع الأداء والتحليلات الذكية',
      confidence: 100,
      type: 'info'
    });
  }

  // Utility Functions
  
  formatCurrency(amount: number): string {
    if (amount === 0) return '0 ر.س';
    
    return new Intl.NumberFormat('ar-SA', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' ر.س';
  }
  
  formatChange(change: number): string {
    if (change === 0) return '0%';
    
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }
  
  parseValue(valueString: string): number {
    // استخراج الرقم من النص (مثل "1,500 ر.س" -> 1500)
    const numericString = valueString.replace(/[^\d.-]/g, '');
    return parseFloat(numericString) || 0;
  }
  
  getInsightClass(type: string): string {
    const classes: { [key: string]: string } = {
      'success': 'insight-success',
      'info': 'insight-info',
      'warning': 'insight-warning',
      'danger': 'insight-danger'
    };
    return classes[type] || 'insight-info';
  }
  
  getInsightIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'success': '✅',
      'info': '💡',
      'warning': '⚠️',
      'danger': '🚨'
    };
    return icons[type] || '💡';
  }

  // Guide functions
  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }
  
  // Export data (للمستقبل)
  exportAnalytics() {
    console.log('📊 Exporting analytics...');
    alert('ميزة التصدير ستكون متاحة قريباً');
  }
  
  // Change analysis period
  changeAnalysisPeriod(days: number) {
    this.analysisEndDate = new Date();
    this.analysisStartDate = new Date();
    this.analysisStartDate.setDate(this.analysisStartDate.getDate() - days);
    
    console.log(`📅 Changed analysis period to last ${days} days`);
    this.refreshAnalytics();
  }
}