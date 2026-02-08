import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';

interface Step {
  title: string;
  desc: string;
  status: 'done' | 'active' | 'next';
  icon: string;
}

interface Idea {
  title: string;
  tags: { label: string, type: string }[];
  social: 'ig' | 'fb' | 'tw';
  description: string;
}

interface Post {
  title: string;
  time: string;
  status: 'orange' | 'blue';
  social: 'ig' | 'fb' | 'tw';
}

@Component({
  selector: 'app-marketing',
  imports: [CommonModule, SideBar],
  templateUrl: './marketing.html',
  styleUrls: ['./marketing.css']
})
export class Marketing {
  showGuide = false;
openGuide() {
  this.showGuide = true;
}

closeGuide() {
  this.showGuide = false;
}

  // Progress animation
  progress = 40;
  progressWidth = 0;

  // Responsive
  isMobile = false;

  // Hover state for ideas/posts
  hoveredIdea: Idea | null = null;
  hoveredPost: Post | null = null;

  // Steps
  steps: Step[] = [
    { title: 'تحديد الجمهور المستهدف', desc: 'حدد شرائح العملاء المثالية', status: 'done', icon:'check.png' },
    { title: 'إنشاء هوية بصرية', desc: 'شعار، ألوان، وأسلوب موحد', status: 'done', icon:'check.png' },
    { title: 'إطلاق حملة سوشيال ميديا', desc: '10 منشورات خلال أسبوعين', status: 'active', icon:'check.png' },
    { title: 'تفعيل الإعلانات المدفوعة', desc: 'حملة إعلانية مستهدفة', status: 'next', icon:'check.png' },
    { title: 'قياس النتائج وتحسين الأداء', desc: 'تحليل البيانات والتطوير', status: 'next', icon:'check.png' }
  ];

  // Ideas content
  ideas: Idea[] = [
    { title: 'نصيحة يومية لرواد الأعمال', tags: [{label:'عالي', type:'green'}, {label:'post', type:'gray'}], social:'ig', description:'استخدم هذه الفكرة' },
    { title: 'قصة نجاح عميل', tags: [{label:'متوسط', type:'yellow'}, {label:'thread', type:'gray'}], social:'tw', description:'استخدم هذه الفكرة' },
    { title: 'فيديو توضيحي للمنتج', tags: [{label:'عالي جدًا', type:'green'}, {label:'video', type:'gray'}], social:'fb', description:'استخدم هذه الفكرة' },
    { title: 'عرض خاص لفترة محدودة', tags: [{label:'عالي', type:'green'}, {label:'story', type:'gray'}], social:'ig', description:'استخدم هذه الفكرة' }
  ];

  // Scheduled posts
  posts: Post[] = [
    { title:'نصائح لزيادة الإنتاجية', time:'اليوم، 6:00 م', status:'orange', social:'ig' },
    { title:'عرض نهاية الأسبوع', time:'غدًا، 10:00 ص', status:'orange', social:'fb' },
    { title:'مقابلة مع خبير', time:'الجمعة، 3:00 م', status:'blue', social:'tw' }
  ];

  constructor() {
    this.animateProgress();
    this.checkWidth();
  }

  // Progress animation
  animateProgress() {
    let current = 0;
    const target = this.progress;
    const interval = setInterval(() => {
      if(current >= target) clearInterval(interval);
      else this.progressWidth = ++current;
    }, 15);
  }

  // Responsive
  @HostListener('window:resize')
  checkWidth() {
    this.isMobile = window.innerWidth < 768;
  }

  // Hover handlers
  onIdeaEnter(idea: Idea) { this.hoveredIdea = idea; }
  onIdeaLeave() { this.hoveredIdea = null; }
  onPostEnter(post: Post) { this.hoveredPost = post; }
  onPostLeave() { this.hoveredPost = null; }

  // Step class
  getStepClass(step: Step) {
    return {
      'done': step.status === 'done',
      'active': step.status === 'active',
      'next': step.status === 'next'
    };
  }
  get doneStepsCount() {
  return this.steps.filter(s => s.status === 'done').length;
}

}
