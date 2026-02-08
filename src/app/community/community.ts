import { Component } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-community',
  imports: [CommonModule, SideBar],
  templateUrl: './community.html',
  styleUrl: './community.css'
})
export class Community {

  // Summary cards
  summaryCards = [
    { title: 'المشاركات', value: 1240, icon: '📝', color: 'blue' },
    { title: 'الأعضاء النشطين', value: 345, icon: '👥', color: 'green' },
    { title: 'الفعاليات', value: 12, icon: '🎉', color: 'orange' }
  ];

  // Posts
  posts = [
    { author: 'محمد', role: 'عضو', time: 'قبل ساعة', content: 'مرحبا بالجميع! هذه أول مشاركة لي.', likes: 15, comments: 3 },
    { author: 'سارة', role: 'مشرفة', time: 'قبل ساعتين', content: 'تأكدوا من قراءة القوانين قبل النشر.', likes: 22, comments: 5 },
    { author: 'أحمد', role: 'عضو', time: 'اليوم', content: 'هل يمكنكم مشاركة تجاربكم مع هذا المنتج؟', likes: 10, comments: 2 }
  ];

  // Top Topics
  topTopics = [
    { name: 'التسويق الرقمي', posts: 32 },
    { name: 'تطوير المواقع', posts: 21 },
    { name: 'تحليلات البيانات', posts: 14 }
  ];

  // Events
  events = [
    { title: 'ورشة عمل Angular', date: '2026-02-10', time: '10:00 ص' },
    { title: 'ندوة الذكاء الاصطناعي', date: '2026-02-15', time: '02:00 م' }
  ];

  // Guide popup toggle
  showGuide = false;
  openGuide() { this.showGuide = true; }
  closeGuide() { this.showGuide = false; }
}
