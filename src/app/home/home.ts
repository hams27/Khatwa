import { Component, HostListener, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  standalone: true
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('testimonialsTrack') trackRef!: ElementRef;

  isSticky = false;
  mobileMenuOpen = false;

  navLinks = [
    { name: 'الرئيسية', sectionId: 'hero', active: true },
    { name: 'احتياجاتك', sectionId: 'احتياجاتك', active: false },
    { name: 'خطوات العمل', sectionId: 'خطوات العمل', active: false },
    { name: 'آراء العملاء', sectionId: 'آراء العملاء', active: false },
    { name: 'الأسئلة الشائعة', sectionId: 'الأسئلة الشائعة', active: false },
  ];

  stats = [
    { label: 'رائد أعمال', targetNumber: 10000, suffix: '+', displayValue: '0+' },
    { label: 'نسبة الرضا', targetNumber: 95, suffix: '%', displayValue: '0%' },
    { label: 'زيادة إنتاجية', targetNumber: 50, suffix: '%', displayValue: '0%' },
  ];

  particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 4 + Math.random() * 4
  }));

  needs = [
    { icon: '📊', title: 'لوحة تحكم ذكية', desc: 'شاشة واحدة تعرضلك كل شيء عن مشروعك في لمحة', bg: 'rgba(31,153,80,0.12)', color: '#1f9950' },
    { icon: '🎯', title: 'تسويق مستهدف', desc: 'أدوات تسويق احترافية تساعدك توصل لعملائك الصح', bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    { icon: '💰', title: 'إدارة مالية', desc: 'تتبع إيراداتك ومصروفاتك بدقة مع تقارير فورية', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    { icon: '✅', title: 'إدارة المهام', desc: 'نظّم فريقك وتتبع المهام حتى ما يضيع شيء', bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
    { icon: '📈', title: 'تحليلات عميقة', desc: 'بيانات وتقارير تساعدك تتخذ قرارات أذكى وأسرع', bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
    { icon: '🤝', title: 'مجتمع داعم', desc: 'تواصل مع آلاف رواد الأعمال وشارك خبراتهم', bg: 'rgba(6,182,212,0.12)', color: '#06b6d4' },
  ];

  steps = [
    { icon: '📝', title: 'أنشئ حسابك', desc: 'سجّل مجاناً في أقل من دقيقة بدون بطاقة ائتمان', badge: 'مجاني ١٠٠٪' },
    { icon: '💼', title: 'أخبرنا عن مشروعك', desc: 'أدخل بيانات مشروعك وأهدافك وسنُعدّ كل شيء لك', badge: 'دقيقتان فقط' },
    { icon: '🚀', title: 'ابدأ النجاح', desc: 'احصل على خطط وأدوات جاهزة فوراً وابدأ رحلتك', badge: 'فوري' },
  ];

  // ✅ البيانات الأصلية للـ testimonials
  testimonials = [
    { name: 'أحمد محمد', role: 'مؤسس متجر إلكتروني', text: 'أفضل منصة استخدمتها لإدارة مشروعي. وفرت علي وقت ومجهود كتير جداً!' },
    { name: 'سارة أحمد', role: 'صاحبة مشروع تصميم', text: 'المنصة ساعدتني أنظم شغلي وأزود أرباحي بنسبة ١٥٠٪ في ٣ شهور!' },
    { name: 'خالد عبدالله', role: 'مدير تسويق', text: 'دعم فني ممتاز وأدوات قوية جداً. أنصح كل رائد أعمال يجربها' },
    { name: 'نورة القحطاني', role: 'رائدة أعمال', text: 'من أروع القرارات اللي اتخذتها للمشروع. الفريق محترف والمنصة سهلة' },
    { name: 'فيصل العتيبي', role: 'صاحب شركة ناشئة', text: 'خطوة غيّرت طريقة إدارتي للمشروع بالكامل. ما تخيلت إنه أسهل من كده' },
    { name: 'منال الزهراني', role: 'مؤسسة وكالة تسويق', text: 'التحليلات والتقارير أعطتني رؤية واضحة قدرت أبني عليها قرارات صح' },
  ];

  // ✅ النسخة المضاعفة اللي بتتعرض في الـ HTML (3 نسخ عشان اللوب يكون سلس)
  allTestimonials: any[] = [];

  faqs = [
    { q: 'هل خطوة مجانية؟', a: 'نعم! يمكنك البدء مجاناً بدون بطاقة ائتمان. لدينا خطة مجانية تشمل جميع الميزات الأساسية، وخطط متقدمة للمشاريع الأكبر.', open: false },
    { q: 'هل المنصة مناسبة للمشاريع الصغيرة؟', a: 'بالتأكيد! خطوة مصممة خصيصاً لأصحاب المشاريع الصغيرة ورواد الأعمال الشباب. بسيطة في الاستخدام وقوية في الإمكانيات.', open: false },
    { q: 'كيف يمكنني إضافة فريق العمل؟', a: 'بعد إنشاء حسابك، يمكنك دعوة أعضاء فريقك بسهولة عبر البريد الإلكتروني. كل عضو سيحصل على صلاحيات مخصصة حسب دوره.', open: false },
    { q: 'هل بياناتي آمنة؟', a: 'أمان بياناتك أولويتنا القصوى. نستخدم تشفيراً من الدرجة الأولى وننتهج أفضل ممارسات الأمن السيبراني لحماية معلوماتك.', open: false },
    { q: 'هل يمكنني تصدير تقارير؟', a: 'نعم! يمكنك تصدير جميع تقاريرك بصيغة PDF أو Excel في أي وقت. التقارير شاملة وتغطي جميع جوانب مشروعك.', open: false },
    { q: 'ما هي وسائل الدعم المتاحة؟', a: 'نقدم دعماً فنياً على مدار الساعة عبر الواتساب والبريد الإلكتروني والدردشة المباشرة. فريقنا مستعد دائماً لمساعدتك.', open: false },
  ];

  private scrollObserver?: IntersectionObserver;
  private typedInterval?: any;
  private typedPhrases = ['خطوة بخطوة', 'نحو النجاح', 'وبنساعدك دائماً', 'نحو أهدافك'];
  private typedIndex = 0;
  private charIndex = 0;
  private isDeleting = false;

  // ✅ متغيرات الـ infinite scroll
  private scrollAnimFrame?: number;
  private currentX = 0;
  private isPaused = false;
  private readonly CARD_WIDTH = 340;
  private readonly CARD_GAP = 20;
  private readonly SCROLL_SPEED = 0.6; // كلما قل الرقم كلما كانت الحركة أبطأ

  ngOnInit() {
    // ✅ ضاعف الـ testimonials 3 مرات عشان اللوب يكون سلس
    this.allTestimonials = [
      ...this.testimonials,
      ...this.testimonials,
      ...this.testimonials
    ];
  }

  ngAfterViewInit() {
    this.initScrollReveal();
    this.initTypewriter();
    this.startCounters();
    // ✅ ابدأ الـ infinite scroll بعد ما الـ view يتبني
    setTimeout(() => this.startInfiniteScroll(), 300);
  }

  ngOnDestroy() {
    if (this.scrollObserver) this.scrollObserver.disconnect();
    if (this.typedInterval) clearTimeout(this.typedInterval);
    // ✅ وقف الـ animation لما الـ component يتدمر
    if (this.scrollAnimFrame) cancelAnimationFrame(this.scrollAnimFrame);
  }

  // ===== ✅ INFINITE SCROLL =====
 startInfiniteScroll() {
  const track = this.trackRef?.nativeElement;
  if (!track) return;

  // ✅ استنى الـ DOM يتبني عشان نحسب الـ width صح
  requestAnimationFrame(() => {
    const singleSetWidth = track.scrollWidth / 3;

    const animate = () => {
      if (!this.isPaused) {
        this.currentX -= this.SCROLL_SPEED;

        // ✅ modulo بيخلي الرجوع سلس بدون jump
        if (this.currentX <= -singleSetWidth) {
          this.currentX += singleSetWidth;
        }

        track.style.transform = `translateX(${this.currentX}px)`;
      }
      this.scrollAnimFrame = requestAnimationFrame(animate);
    };

    track.addEventListener('mouseenter', () => { this.isPaused = true; });
    track.addEventListener('mouseleave', () => { this.isPaused = false; });

    this.scrollAnimFrame = requestAnimationFrame(animate);
  });
}

  // ===== TYPEWRITER =====
  initTypewriter() {
    const el = document.getElementById('typed-text');
    if (!el) return;
    const type = () => {
      const phrase = this.typedPhrases[this.typedIndex];
      if (this.isDeleting) {
        el.textContent = phrase.substring(0, this.charIndex - 1);
        this.charIndex--;
      } else {
        el.textContent = phrase.substring(0, this.charIndex + 1);
        this.charIndex++;
      }
      let speed = this.isDeleting ? 60 : 100;
      if (!this.isDeleting && this.charIndex === phrase.length) {
        speed = 2000;
        this.isDeleting = true;
      } else if (this.isDeleting && this.charIndex === 0) {
        this.isDeleting = false;
        this.typedIndex = (this.typedIndex + 1) % this.typedPhrases.length;
        speed = 400;
      }
      this.typedInterval = setTimeout(type, speed);
    };
    setTimeout(type, 1200);
  }

  // ===== SCROLL REVEAL =====
  initScrollReveal() {
    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      this.scrollObserver!.observe(el);
    });
  }

  // ===== COUNTERS =====
  startCounters() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.stats.forEach((stat, i) => {
            const end = stat.targetNumber;
            const dur = 2000;
            const startTime = performance.now();
            const step = (now: number) => {
              const progress = Math.min((now - startTime) / dur, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              stat.displayValue = Math.floor(ease * end).toLocaleString() + stat.suffix;
              if (progress < 1) requestAnimationFrame(step);
              else stat.displayValue = end.toLocaleString() + stat.suffix;
            };
            setTimeout(() => requestAnimationFrame(step), i * 150);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) observer.observe(heroStats);
  }

  // ===== SCROLL =====
  @HostListener('window:scroll')
  onScroll() {
    this.isSticky = window.scrollY > 80;
    this.navLinks.forEach(link => {
      const el = document.getElementById(link.sectionId);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          this.navLinks.forEach(l => l.active = false);
          link.active = true;
        }
      }
    });
  }

  setActiveLink(link: any) {
    this.navLinks.forEach(l => l.active = false);
    link.active = true;
  }

  scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      const top = el.offsetTop - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleFaq(faq: any) {
    faq.open = !faq.open;
  }
}