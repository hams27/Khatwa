import { Component } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tasks-and-team',
  imports: [SideBar, CommonModule],
  templateUrl: './tasks-and-team.html',
  styleUrl: './tasks-and-team.css',
})
export class TasksAndTeam {

  showGuide = false;

  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  // أعضاء الفريق
  teamMembers = [
    { name: 'محمد', tasks: 8, avatar: 'م' },
    { name: 'سارة', tasks: 6, avatar: 'س' },
    { name: 'أحمد', tasks: 5, avatar: 'أ' },
    { name: 'خالد', tasks: 7, avatar: 'خ' }
  ];

  // المهام
  tasks = [
    {
      title: 'إطلاق الحملة الإعلانية',
      desc: 'حملة إعلانات جوجل',
      tags: ['تسويق', 'إعلانات'],
      user: 'علي',
      date: 'أمس',
      priority: 'normal',
      status: 'completed'
    },
    {
      title: 'مراجعة العقد مع المورد',
      desc: 'مراجعة شروط التعاقد الجديد',
      tags: ['قانوني'],
      user: 'فاطمة',
      date: 'اليوم',
      priority: 'urgent',
      status: 'review'
    },
    {
      title: 'تحديث الموقع الإلكتروني',
      desc: 'إضافة صفحة المنتجات الجديدة',
      tags: ['تطوير', 'موقع'],
      user: 'خالد',
      date: 'بعد يومين',
      priority: 'urgent',
      status: 'in-progress'
    },
    {
      title: 'تصميم بوستر إعلاني',
      desc: 'تصميم بوستر لحملة سوشيال ميديا',
      tags: ['تصميم', 'تسويق'],
      user: 'سارة',
      date: 'اليوم',
      priority: 'urgent',
      status: 'in-progress'
    },
    {
      title: 'تدريب الفريق الجديد',
      desc: 'جلسة تدريبية للموظفين الجدد',
      tags: [],
      user: 'نورا',
      date: 'منذ 3 أيام',
      priority: 'medium',
      status: 'todo'
    },
    {
      title: 'كتابة محتوى المدونة',
      desc: 'مقال عن فوائد المنتج',
      tags: [],
      user: 'أحمد',
      date: 'غدًا',
      priority: 'medium',
      status: 'todo'
    }
  ];

  // getters لحساب عدد المهام حسب الحالة
  get todoCount() {
    return this.tasks.filter(t => t.status === 'todo').length;
  }

  get inProgressCount() {
    return this.tasks.filter(t => t.status === 'in-progress').length;
  }

  get reviewCount() {
    return this.tasks.filter(t => t.status === 'review').length;
  }

  get completedCount() {
    return this.tasks.filter(t => t.status === 'completed').length;
  }
}
