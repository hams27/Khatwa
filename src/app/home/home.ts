import { Component, HostListener, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';



declare const AOS: any;

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  standalone: true
})
export class HomeComponent implements OnInit, AfterViewInit {
  
  isSticky = false;
  activeLink = 'الرئيسية';
  isAutoClimbComplete = false;
  
 navLinks = [
    { name: 'الرئيسية', active: true },
    { name: 'احتياجاتك', active: false },
    { name: 'خطوات العمل', active: false },
    { name: 'آراء العملاء', active: false },
    { name: ' الأسئلة الشائعة ', active: false },
    // { name: 'تواصل', active: false }
  ];

stats = [
  { label: 'رائد أعمال', targetNumber: 10000, suffix: '+', displayValue: '0' },
  { label: 'نسبة الرضا', targetNumber: 95, suffix: '%', displayValue: '0' },
  { label: 'زيادة في الإنتاجية', targetNumber: 50, suffix: '%', displayValue: '0' },
];


  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    // تحميل AOS Script
    this.loadAOSScript().then(() => {
      // Initialize AOS بعد ما يتحمل
      if (typeof AOS !== 'undefined') {
        AOS.init({
          duration: 800,
          easing: 'ease-out-cubic',
          once: true,
          offset: 100,
          delay: 50,
        });
      }
    });

    // Start number counter animations
    this.startCounterAnimations();
    
    // Add parallax effect
    this.initParallax();
    
 
  }

  ngAfterViewInit() {
    // Refresh AOS after view init
    setTimeout(() => {
      if (typeof AOS !== 'undefined') {
        AOS.refresh();
      }
    }, 100);

    // Add intersection observer for stats
    this.observeStats();
    
    // Add magnetic effect to buttons
    this.addMagneticEffect();

    // ========== بدء أنيميشن التسلق التلقائي ==========
    this.startAutoClimbing();
  }

  // ========== أنيميشن التسلق التلقائي ==========
  startAutoClimbing() {
    const character = document.querySelector('.character');
    if (character) {
      // الظهور من الشمال
      setTimeout(() => {
        character.classList.add('appear');
      }, 500);

      // بدء التسلق التلقائي
      setTimeout(() => {
        character.classList.add('auto-climbing', 'climbing');
      }, 1700);

      // إنهاء التسلق التلقائي والتحويل للتحكم اليدوي
      setTimeout(() => {
        character.classList.remove('auto-climbing', 'climbing');
        character.classList.add('manual-control');
        this.isAutoClimbComplete = true;
      }, 5200); // 500 + 1700 + 3000 (مدة التسلق)
    }
  }

  // تحميل AOS من CDN
  private loadAOSScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // تحقق إذا AOS محمل فعلاً
      if (typeof AOS !== 'undefined') {
        resolve();
        return;
      }

      // تحميل CSS
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
      document.head.appendChild(linkElement);

      // تحميل JS
      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
      scriptElement.onload = () => resolve();
      scriptElement.onerror = () => reject();
      document.body.appendChild(scriptElement);
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Sticky header
    this.isSticky = scrollTop > 100;
    
    // Scroll progress bar
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    document.documentElement.style.setProperty('--scroll-progress', scrolled + '%');
    
    // ========== CHARACTER MANUAL CONTROL بعد انتهاء التسلق التلقائي ==========
    if (this.isAutoClimbComplete) {
      const character = document.querySelector('.character') as HTMLElement;
      if (character) {
        const heroSection = document.querySelector('.hero-modern') as HTMLElement;
        if (heroSection) {
          const sectionTop = heroSection.offsetTop;
          const sectionHeight = heroSection.offsetHeight;
          const scrollProgress = (scrollTop - sectionTop) / sectionHeight;
          
          // تحريك الشخصية بناءً على الـ scroll فقط بعد انتهاء التسلق التلقائي
          if (scrollProgress >= 0 && scrollProgress <= 1) {
            const climbProgress = scrollProgress * 100;
            
            // حساب المواقع (من نقطة نهاية التسلق التلقائي)
            const bottomStart = 300; // نقطة انتهاء التسلق التلقائي
            const bottomEnd = 360;   // نقطة أعلى
            const leftStart = 330;   // نقطة انتهاء التسلق التلقائي
            const leftEnd = 390;     // نقطة أبعد
            
            const currentBottom = bottomStart + (bottomEnd - bottomStart) * (climbProgress / 100);
            const currentLeft = leftStart + (leftEnd - leftStart) * (climbProgress / 100);
            
            // حساب الحجم (يستمر في التصغير)
            const scaleStart = 0.6;
            const scaleEnd = 0.3;
            const currentScale = scaleStart - (scaleStart - scaleEnd) * (climbProgress / 100);
            
            character.style.bottom = `${currentBottom}px`;
            character.style.left = `${currentLeft}px`;
            character.style.transform = `scale(${currentScale})`;
            
            // إضافة animation class
            if (climbProgress > 5) {
              character.classList.add('climbing');
            } else {
              character.classList.remove('climbing');
            }
          }
        }
      }
    }
    
    // Hide/show scroll indicator
    const scrollIndicator = document.querySelector('.scroll-indicator') as HTMLElement;
    if (scrollIndicator) {
      if (scrollTop > 300) {
        scrollIndicator.classList.add('hidden');
      } else {
        scrollIndicator.classList.remove('hidden');
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Parallax effect for floating elements
    const floatingElements = document.querySelectorAll('.float-icon');
    
    floatingElements.forEach((element: any, index) => {
      const speed = (index + 1) * 0.02;
      const x = (window.innerWidth - event.pageX * speed) / 100;
      const y = (window.innerHeight - event.pageY * speed) / 100;
      
      element.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
    
    // Parallax for gradient orbs
    const orbs = document.querySelectorAll('.gradient-orb');
    orbs.forEach((orb: any, index) => {
      const speed = (index + 1) * 0.01;
      const x = (event.pageX - window.innerWidth / 2) * speed;
      const y = (event.pageY - window.innerHeight / 2) * speed;
      
      orb.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  setActiveLink(link: any) {
    this.navLinks.forEach(l => l.active = false);
    link.active = true;
    this.activeLink = link.name;
    
   
  }

  // ========== COUNTER ANIMATIONS ==========
  startCounterAnimations() {
    this.stats.forEach((stat, index) => {
      setTimeout(() => {
        this.animateCounter(stat);
      }, index * 200);
    });
  }

animateCounter(stat: any) {
  let start = 0;
  const end = stat.targetNumber;
  const suffix = stat.suffix || '';
  const duration = 7000; // 2 ثواني
  const startTime = performance.now();

  const step = (currentTime: number) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    stat.displayValue = Math.floor(progress * end).toLocaleString() + suffix;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      stat.displayValue = end.toLocaleString() + suffix;
    }
  };

  requestAnimationFrame(step);
}


  // ========== INTERSECTION OBSERVER FOR STATS ==========
 observeStats() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Number(entry.target.getAttribute('data-index'));
        this.animateCounter(this.stats[index]);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const statElements = document.querySelectorAll('.stat-item');
  statElements.forEach((el, i) => {
    el.setAttribute('data-index', i.toString());
    observer.observe(el);
  });
}


  // ========== PARALLAX EFFECT ==========
  initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    window.addEventListener('scroll', () => {
      parallaxElements.forEach((element: any) => {
        const speed = element.getAttribute('data-parallax') || 0.5;
        const yPos = -(window.pageYOffset * parseFloat(speed));
        element.style.transform = `translateY(${yPos}px)`;
      });
    });
  }

  // ========== CUSTOM CURSOR EFFECT ==========


  // ========== MAGNETIC EFFECT FOR BUTTONS ==========
  addMagneticEffect() {
    const magneticElements = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-outline');
    
    magneticElements.forEach((element: any) => {
      element.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        element.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = 'translate(0, 0)';
      });
    });
  }



  // ========== SMOOTH SCROLL TO SECTION ==========
  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 100;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  }

  // ========== TILT EFFECT FOR CARDS ==========
  initTiltEffect() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card: any) => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
      });
    });
  }

  // ========== TYPING EFFECT FOR HEADING ==========
  initTypingEffect() {
    const heading = document.querySelector('.hero h1');
    if (heading) {
      const text = heading.textContent || '';
      heading.textContent = '';
      
      let i = 0;
      const typeWriter = () => {
        if (i < text.length) {
          heading.textContent += text.charAt(i);
          i++;
          setTimeout(typeWriter, 100);
        }
      };
      
      setTimeout(typeWriter, 500);
    }
  }

  // ========== PARTICLE SYSTEM ==========
  initParticleSystem() {
    const particlesContainer = document.querySelector('.header-particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 5 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      particlesContainer.appendChild(particle);
    }
  }

  // ========== SCROLL REVEAL ANIMATION ==========
  initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, {
      threshold: 0.2
    });
    
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ========== TEXT SPLIT ANIMATION ==========
  splitTextAnimation(element: HTMLElement) {
    const text = element.textContent || '';
    element.textContent = '';
    
    text.split('').forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.animationDelay = `${index * 0.05}s`;
      span.classList.add('char-animate');
      element.appendChild(span);
    });
  }

  // ========== DESTROY COMPONENT ==========
  ngOnDestroy() {
    // Clean up custom cursor
    const cursor = document.querySelector('.custom-cursor');
    const cursorDot = document.querySelector('.custom-cursor-dot');
    if (cursor) cursor.remove();
    if (cursorDot) cursorDot.remove();
    
    // Destroy AOS
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }
}