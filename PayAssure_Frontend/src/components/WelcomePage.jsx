import React, { useEffect, useState } from "react";

// HeroCarousel Component
const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image:
        "https://imgs.search.brave.com/BzXN9WIae9_ho9PkoOdmrebpYau3ej86ZHwkMlSSQ3w/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJiYXQuY29t/L2ltZy8xNDkxNjk3/LWRvd25sb2FkLWEt/aGFwcHktZmFtaWx5/LmpwZw",
      alt: "Credit card and online shopping",
      heading: "Innovating Your Financial Experience",
      quote: "Modern solutions for modern lives. Payments made simple and smart.",
    },
    {
      image:
        "https://images.unsplash.com/photo-1579621970795-87facc2f976d?fit=crop&w=1400&h=700&q=80",
      alt: "Online payment on a laptop",
      heading: "Seamless Payments, Secure Transactions",
      quote: "Your financial security is our priority. Effortless payments, every time.",
    },
    {
      image:
        "https://imgs.search.brave.com/y5RZQ-_ikpInKRT572WfVw3WhFYPRCn3F48Km9xgQog/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvaGFw/cHktZmFtaWx5LXBp/Y3R1cmVzLTluM29l/cHRhZHdtb2o5b2Iu/anBn",
      alt: "Family enjoying outdoors",
      heading: "Life's Journeys, Covered",
      quote: "From unexpected twists to planned adventures, we're with you.",
    },
    {
      image:
        "https://imgs.search.brave.com/wF3AM_U50kPo9bgdn-SjjjLKtTz6YUz8IcR4Z0lf8ts/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvaGFw/cHktZmFtaWx5LXBp/Y3R1cmVzLTN2YjNq/aXRweXN3dnNjYW4u/anBn",
      alt: "Insurance policy papers and hands",
      heading: "Protecting What Matters Most",
      quote: "Peace of mind, assured. We safeguard your dreams.",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="hero-carousel">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`hero-slide ${index === currentSlide ? "active" : ""}`}
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${slide.image})`,
          }}
        >
          {/* Header/Nav elements directly on the slide */}
          <div className="hero-nav">
            <div className="logo">PayAssure</div>
            <a href="/login" className="login-btn">
              Login
            </a>
          </div>

          <div className="hero-content">
            <h1>{slide.heading}</h1>
            <p>{slide.quote}</p>
          </div>
        </div>
      ))}
      <div className="carousel-dots">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentSlide ? "active" : ""}`}
            onClick={() => setCurrentSlide(index)}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default function PayAssureLanding() {
  // Animate-on-scroll effect
  useEffect(() => {
    function animateOnScroll() {
      document.querySelectorAll(".animate-on-scroll").forEach((el) => {
        const top = el.getBoundingClientRect().top;
        if (top < window.innerHeight - 150) el.classList.add("animated");
      });
    }
    window.addEventListener("scroll", animateOnScroll);
    window.addEventListener("load", animateOnScroll);
    animateOnScroll();
    return () => {
      window.removeEventListener("scroll", animateOnScroll);
      window.removeEventListener("load", animateOnScroll);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        html, body, #root { width: 100vw; min-height: 100vh; overflow-x: hidden; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333;}

        .hero-carousel { position: relative; width: 100vw; height: 100vh; min-height: 600px; overflow: hidden; }
        .hero-slide {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background-size: cover; background-position: center;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; color: white; opacity: 0;
          transition: opacity 1.5s ease-in-out; padding: 0 16px;
        }
        .hero-slide.active { opacity: 1; }
        .hero-nav {
          position: absolute; top: 0; left: 0; width: 100%;
          padding: 1.5rem 2rem;
          display: flex; justify-content: space-between; align-items: center; z-index: 10;
          background: linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0));
        }
        .hero-nav .logo {
          font-size: 2.2rem; font-weight: bold; color: white;
          text-shadow: 0 3px 15px rgba(0,0,0,0.5);
          animation: logoFloat 3s ease-in-out infinite alternate;
        }
        @keyframes logoFloat {
          from { transform: translateY(0px);}
          to { transform: translateY(-3px);}
        }

        .hero-nav .login-btn {
          background: white; color: #1A2980;
          padding: 14px 28px; border: none; border-radius: 50px;
          font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; display: inline-block;
          box-shadow: 0 5px 20px rgba(0,0,0,0.4);
        }
        .hero-nav .login-btn:hover {
          transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.55); color: #26D0CE;
        }

        .hero-carousel .hero-content { z-index: 2; max-width: 900px; padding: 0 16px; animation: fadeInUp 1s ease-out; }
        .hero-carousel .hero-content h1 { font-size: 4rem; margin-bottom: 1rem; animation: slideInLeft 1s ease-out 0.5s both; }
        .hero-carousel .hero-content p { font-size: 1.3rem; margin-bottom: 2rem; animation: slideInRight 1s ease-out 0.7s both; }
        .carousel-dots {
          position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
          z-index: 3; display: flex; gap: 10px;
        }
        .dot {
          width: 12px; height: 12px; background: rgba(255,255,255,0.5);
          border-radius: 50%; cursor: pointer; transition: all 0.3s ease;
          border: 1px solid rgba(255,255,255,0.8);
        }
        .dot.active {
          background: white; transform: scale(1.2);
          box-shadow: 0 0 10px rgba(255,255,255,0.8);
        }
           
        @keyframes fadeInUp {from {opacity: 0; transform: translateY(50px);} to {opacity:1; transform: translateY(0);}}
        @keyframes slideInLeft {from {opacity: 0; transform: translateX(-100px);} to {opacity:1; transform: translateX(0);}}
        @keyframes slideInRight {from {opacity: 0; transform: translateX(100px);} to {opacity:1; transform: translateX(0);}}

        .about-us-section { padding: 5rem max(2vw, 16px); width: 100vw; background: #f8f9fa; position: relative; display: flex; justify-content: center; z-index: 1;}
        .about-us-container { max-width: 900px; background: rgba(255,255,255,0.95); box-shadow: 0 12px 50px rgba(102,126,234,0.1); border-radius: 22px; padding: 3.5rem 4vw 3rem 4vw; font-family: inherit; color: #25385F; line-height: 1.8; font-size: 1.2rem; text-align: center; user-select: text; border: 1px solid #eee;}
        .about-us-title, .section-title { font-size: 2.8rem; margin-bottom: 1.5rem; font-weight: 700; color: #333; position: relative; text-align: center; padding-bottom: 20px; }
        .about-us-title::after, .section-title::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100px; height: 5px; background: linear-gradient(45deg, #1A2980, #26D0CE); border-radius: 3px; }

        .services { padding: 5rem max(2vw, 16px); width: 100vw; background: white; text-align: center; }
        .services-grid { max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 2.5rem; margin-top: 3.5rem; }
        .service-card { background: white; padding: 2.5rem; border-radius: 20px; box-shadow: 0 15px 45px rgba(0,0,0,0.08); text-align: center; transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); border: 1px solid #f0f0f0; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
        .service-card:hover { transform: translateY(-12px); box-shadow: 0 25px 50px rgba(0,0,0,0.12);}
        .service-icon { width: 90px; height: 90px; background: linear-gradient(45deg, #1A2980, #26D0CE); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2.5rem; color: white; box-shadow: 0 5px 20px rgba(26,41,128,0.4);}
        .service-card h3 { font-size: 1.8rem; margin-bottom: 1rem; color: #333; font-weight: 600;}
        .service-card p { color: #555; line-height: 1.7; font-size: 1.05rem; }

        .stats { padding: 5rem max(2vw, 16px); width: 100vw; background: linear-gradient(135deg,#1A2980 0%,#26D0CE 100%); color: white; text-align: center;}
        .stats-grid { max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 2rem; text-align: center;}
        .stat-item { padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 15px; backdrop-filter: blur(5px); transition: transform 0.3s ease, background 0.3s ease;}
        .stat-item:hover { transform: translateY(-5px); background: rgba(255,255,255,0.15);}
        .stat-number { font-size: 3.5rem; font-weight: 700; margin-bottom: 0.8rem; animation: countUp 2s ease-out; text-shadow: 0 2px 10px rgba(0,0,0,0.2);}
        .stat-label { font-size: 1.2rem; opacity: 0.95; font-weight: 500;}
        @keyframes countUp {from {opacity: 0; transform: translateY(20px);} to {opacity: 1; transform: translateY(0);}}

        .footer { width: 100vw; background: #1a1a1a; color: white; padding: 4rem 2rem 2rem;}
        .footer-content { max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 2rem;}
        .footer-section h3 { font-size: 1.5rem; margin-bottom: 1.2rem; color: #26D0CE; font-weight: 600;}
        .footer-section p,
        .footer-section li { color: #bbb; margin-bottom: 0.7rem; line-height: 1.7; font-size: 1rem;}
        .footer-section ul { list-style: none; }
        .footer-section a { color: #bbb; text-decoration: none; transition: color 0.3s ease;}
        .footer-section a:hover { color: #26D0CE; text-decoration: underline;}
        .footer-bottom { text-align: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #333; color: #888; font-size: 0.95rem;}
        .animate-on-scroll { opacity: 0; transform: translateY(50px); transition: all 0.6s ease-out;}
        .animate-on-scroll.animated { opacity: 1; transform: translateY(0);}

        @media (max-width: 768px) {
          .hero-nav { padding: 1.2rem 1.5rem; }
          .hero-nav .logo { font-size: 1.8rem; }
          .hero-nav .login-btn { padding: 10px 20px; font-size: 0.9rem; }
          .hero-carousel .hero-content h1 { font-size: 3rem; }
          .hero-carousel .hero-content p { font-size: 1.1rem; }
          .hero-carousel { min-height: 550px; }
          .about-us-container { padding: 2.5rem 3vw 2rem 3vw; }
          .about-us-title, .section-title { font-size: 2.2rem; }
          .about-us-container p { font-size: 1.1rem; }
          .services-grid { gap: 2rem; }
          .service-card { padding: 2rem; }
          .service-icon { width: 70px; height: 70px; font-size: 2rem; }
          .service-card h3 { font-size: 1.5rem; }
          .service-card p { font-size: 1rem; }
          .stats-grid { grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); }
          .stat-number { font-size: 2.8rem; }
          .stat-label { font-size: 1rem; }
          .footer-content { grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); }
          .footer-section h3 { font-size: 1.3rem; }
          .footer-section p, .footer-section li { font-size: 0.9rem; }
          .footer-bottom { font-size: 0.85rem; }
        }
        @media (max-width: 480px) {
          .hero-nav { flex-direction: column; gap: 1rem; padding: 1rem; }
          .hero-nav .login-btn { width: 80%; text-align: center; }
          .hero-carousel .hero-content h1 { font-size: 2.2rem; }
          .hero-carousel .hero-content p { font-size: 1rem; }
          .hero-carousel { min-height: 450px; }
          .about-us-section, .services, .stats, .footer { padding: 3rem 1rem; }
          .about-us-title, .section-title { font-size: 1.8rem; }
          .about-us-container p { font-size: 1rem; }
          .stats-grid { grid-template-columns: 1fr; }
          .stat-item { padding: 1.5rem; }
          .footer-content { grid-template-columns: 1fr; text-align: center; }
        }
      `}</style>

      {/* Hero Carousel */}
      <HeroCarousel />

      {/* About Us Section */}
      <section className="about-us-section" id="about">
        <div className="about-us-container animate-on-scroll">
          <h2 className="about-us-title">About Us</h2>
          <p>
            At PayAssure, we specialize in providing seamless and secure payment solutions, leveraging the power of Razorpay’s industry-leading technology.
            Our platform is designed to deliver smooth transaction experiences for individuals and businesses alike, ensuring transparency, reliability, and swift processing.
          </p>
          <p>
            With Razorpay integrated into our system, you gain access to a trusted payment gateway that supports multiple payment options including cards, UPI, wallets, and net banking — all protected with top-notch security standards.
            We are committed to helping you manage payments effortlessly, enabling you to focus on what matters most.
          </p>
          <p>
            Whether you're paying your insurance premium, renewing policies, or handling claims, PayAssure and Razorpay together provide a secure and user-friendly environment for all your payment needs.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="services">
        <h2 className="section-title animate-on-scroll">Our Insurance Solutions</h2>
        <div className="services-grid">
          <div className="service-card animate-on-scroll">
            <div className="service-icon">🏠</div>
            <h3>Home Insurance</h3>
            <p>Comprehensive protection for your home and belongings with customizable coverage options.</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">🚗</div>
            <h3>Auto Insurance</h3>
            <p>Full coverage auto insurance with competitive rates and 24/7 roadside assistance.</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">💼</div>
            <h3>Business Insurance</h3>
            <p>Tailored business protection plans to safeguard your company's assets and operations.</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">❤️</div>
            <h3>Health Insurance</h3>
            <p>Comprehensive health coverage plans for individuals and families with extensive provider networks.</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">✈️</div>
            <h3>Travel Insurance</h3>
            <p>Complete travel protection including trip cancellation, medical emergencies, and lost luggage.</p>
          </div>
          <div className="service-card animate-on-scroll">
            <div className="service-icon">👥</div>
            <h3>Life Insurance</h3>
            <p>Secure your family's financial future with our flexible life insurance policies.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        <h2 className="section-title animate-on-scroll">Our Achievements</h2>
        <div className="stats-grid">
          <div className="stat-item animate-on-scroll">
            <div className="stat-number">50K+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat-item animate-on-scroll">
            <div className="stat-number">10+</div>
            <div className="stat-label">Years of Experience</div>
          </div>
          <div className="stat-item animate-on-scroll">
            <div className="stat-number">99.8%</div>
            <div className="stat-label">Customer Satisfaction</div>
          </div>
          <div className="stat-item animate-on-scroll">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>About PayAssure</h3>
            <p>PayAssure is a leading insurance company committed to providing comprehensive protection and exceptional service to individuals, families, and businesses across the nation.</p>
            <p>Founded in 1998, we have been building trust and security for over 25 years.</p>
          </div>
          <div className="footer-section">
            <h3>Our Services</h3>
            <ul>
              <li><a href="#">Auto Insurance</a></li>
              <li><a href="#">Home Insurance</a></li>
              <li><a href="#">Business Insurance</a></li>
              <li><a href="#">Health Insurance</a></li>
              <li><a href="#">Life Insurance</a></li>
              <li><a href="#">Travel Insurance</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Customer Support</h3>
            <ul>
              <li>📞 1-800-PAYASSURE</li>
              <li>✉️ support@payassure.com</li>
              <li>💬 Live Chat Available 24/7</li>
              <li>📄 Policy Management</li>
              <li>❓ FAQ & Help Center</li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Company Info</h3>
            <ul>
              <li>📍 123 Insurance Plaza<br/>Bengaluru, Karnataka</li>
              <li>🏆 A+ Rated by AM Best</li>
              <li>📊 Publicly Traded (NYSE: PAYR)</li>
              <li>🌍 Licensed in all 10 states</li>
              <li>👥 Over 1000 employees</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; 2025 PayAssure Insurance Company. All rights reserved. | Privacy Policy | Terms of Service | Accessibility
          </p>
        </div>
      </footer>
    </>
  );
}



// import React, { useEffect } from "react";

// export default function PayAssureLanding() {
//   // Animate-on-scroll effect
//   useEffect(() => {
//     function animateOnScroll() {
//       document.querySelectorAll('.animate-on-scroll').forEach((el) => {
//         const top = el.getBoundingClientRect().top;
//         if (top < window.innerHeight - 150) el.classList.add('animated');
//       });
//     }
//     window.addEventListener('scroll', animateOnScroll);
//     window.addEventListener('load', animateOnScroll);
//     animateOnScroll();
//     return () => {
//       window.removeEventListener('scroll', animateOnScroll);
//       window.removeEventListener('load', animateOnScroll);
//     };
//   }, []);

//   // Header scroll effect
//   useEffect(() => {
//     function handleHeaderScroll() {
//       const header = document.querySelector('.header');
//       if (!header) return;
//       if (window.scrollY > 100) {
//         header.style.background = 'rgba(255,255,255,0.98)';
//         header.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.15)';
//       } else {
//         header.style.background = 'rgba(255,255,255,0.95)';
//         header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
//       }
//     }
//     window.addEventListener('scroll', handleHeaderScroll);
//     return () => window.removeEventListener('scroll', handleHeaderScroll);
//   }, []);

//   return (
//     <>
//       <style>{`
//         html, body, #root {
//           width: 100vw !important;
//           min-height: 100vh;
//           overflow-x: hidden !important;
//         }
//         * {margin: 0; padding: 0; box-sizing: border-box;}
//         body {font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;}
//         .header {
//           position: fixed; top: 0; left: 0; width: 100vw;
//           background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
//           padding: 1rem 2rem; display: flex; justify-content: space-between;
//           align-items: center; z-index: 1000;
//           box-shadow: 0 2px 20px rgba(0,0,0,0.1); transition: all 0.3s ease;
//         }
//         .logo {
//           font-size: 2rem; font-weight: bold;
//           background: linear-gradient(45deg, #667eea, #764ba2);
//           -webkit-background-clip: text; -webkit-text-fill-color: transparent;
//           background-clip: text;
//           animation: logoGlow 2s ease-in-out infinite alternate;
//         }
//         @keyframes logoGlow {from {filter: drop-shadow(0 0 5px rgba(102,126,234,0.3));} to {filter: drop-shadow(0 0 15px rgba(102,126,234,0.6));}}
//         .login-btn {
//           background: linear-gradient(45deg, #667eea, #764ba2); color: white;
//           padding: 12px 24px; border: none; border-radius: 50px;
//           font-weight: 600; cursor: pointer; transition: all 0.3s ease;
//           text-decoration: none; display: inline-block;
//         }
//         .login-btn:hover {transform:translateY(-2px); box-shadow:0 10px 25px rgba(102,126,234,0.4);}
//         .hero {
//           height: 100vh; min-height: 700px;
//           width: 100vw; max-width: 100vw; overflow-x: hidden;
//           background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
//           display: flex; align-items: center; justify-content: center;
//           text-align: center; color: white; position: relative;
//         }
//         .hero::before {
//           content: '';
//           position: absolute; top: 0; left: 0; right: 0; bottom: 0;
//           background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="rgba(255,255,255,0.1)" points="0,1000 1000,0 1000,1000"/></svg>');
//           animation: float 6s ease-in-out infinite;
//         }
//         @keyframes float {0%,100% {transform: translateY(0);} 50% {transform: translateY(-20px);}}
//         .hero-content {
//           z-index: 2;
//           animation: fadeInUp 1s ease-out;
//           max-width: 900px;
//           padding: 0 16px;
//         }
//         @keyframes fadeInUp {from {opacity: 0; transform: translateY(50px);} to {opacity:1; transform: translateY(0);}}
//         .hero h1 {font-size: 4rem; margin-bottom: 1rem; animation:slideInLeft 1s ease-out 0.5s both;}
//         .hero p {font-size: 1.3rem; margin-bottom: 2rem; animation:slideInRight 1s ease-out 0.7s both;}
//         @keyframes slideInLeft {from {opacity: 0; transform: translateX(-100px);} to {opacity:1; transform: translateX(0);}}
//         @keyframes slideInRight {from {opacity: 0; transform: translateX(100px);} to {opacity:1; transform: translateX(0);}}

//         /* About Us Section (replaces the old carousel) */
//         .about-us-section {
//           padding: 5rem max(2vw, 16px);
//           width: 100vw;
//           background: #f8f9fa;
//           position: relative;
//           display: flex;
//           justify-content: center;
//         }
//         .about-us-container {
//           max-width: 900px;
//           background: rgba(255,255,255,0.92);
//           box-shadow: 0 8px 40px rgba(102,126,234,0.07);
//           border-radius: 22px;
//           padding: 3.5rem 4vw 3rem 4vw;
//           font-family: inherit;
//           color: #25385F;
//           line-height: 1.6;
//           font-size: 1.3rem;
//           text-align: center;
//           user-select: text;
//         }
//         .about-us-title {
//           font-size: 2.5rem;
//           margin-bottom: 1.5rem;
//           font-weight: 700;
//           color: #333;
//           position: relative;
//         }
//         .about-us-title::after {
//           content: '';
//           position: absolute;
//           bottom: -14px;
//           left: 50%;
//           transform: translateX(-50%);
//           width: 80px;
//           height: 4px;
//           background: linear-gradient(45deg, #667eea, #764ba2);
//           border-radius: 3px;
//         }

//         /* Other sections left unchanged */
//         .services {
//           padding: 5rem max(2vw, 16px);
//           width: 100vw;
//           background: white;
//         }
//         .services-grid {
//           max-width: 1200px;
//           margin: 0 auto;
//           width: 100%;
//           display: grid;
//           grid-template-columns: repeat(auto-fit,minmax(300px,1fr));
//           gap: 2rem;
//           margin-top: 3rem;
//         }
//         .service-card {
//           background: white;
//           padding: 2rem;
//           border-radius: 15px;
//           box-shadow: 0 10px 30px rgba(0,0,0,0.1);
//           text-align: center;
//           transition: all 0.3s ease;
//           border: 1px solid #eee;
//         }
//         .service-card:hover {
//           transform: translateY(-10px);
//           box-shadow: 0 20px 40px rgba(0,0,0,0.15);
//         }
//         .service-icon {
//           width: 80px;
//           height: 80px;
//           background: linear-gradient(45deg, #667eea, #764ba2);
//           border-radius: 50%;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           margin: 0 auto 1rem;
//           font-size: 2rem;
//           color: white;
//         }
//         .service-card h3 {
//           font-size: 1.5rem;
//           margin-bottom: 1rem;
//           color: #333;
//         }
//         .service-card p {
//           color: #666;
//           line-height: 1.6;
//         }
//         .stats {
//           padding: 5rem max(2vw, 16px);
//           width: 100vw;
//           background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
//           color: white;
//         }
//         .stats-grid {
//           max-width: 1200px;
//           margin: 0 auto;
//           width: 100%;
//           display: grid;
//           grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
//           gap: 2rem;
//           text-align: center;
//         }
//         .stat-item {
//           padding: 2rem;
//         }
//         .stat-number {
//           font-size: 3rem;
//           font-weight: bold;
//           margin-bottom: 0.5rem;
//           animation: countUp 2s ease-out;
//         }
//         .stat-label {
//           font-size: 1.1rem;
//           opacity: 0.9;
//         }
//         @keyframes countUp {
//           from {opacity: 0; transform: translateY(20px);}
//           to {opacity: 1; transform: translateY(0);}
//         }
//         .footer {
//           width: 100vw;
//           background: #1a1a1a;
//           color: white;
//           padding: 4rem 2rem 2rem;
//         }
//         .footer-content {
//           max-width: 1200px;
//           margin: 0 auto;
//           width: 100%;
//           display: grid;
//           grid-template-columns: repeat(auto-fit,minmax(250px,1fr));
//           gap: 2rem;
//         }
//         .footer-section h3 {
//           font-size: 1.3rem;
//           margin-bottom: 1rem;
//           color: #667eea;
//         }
//         .footer-section p,
//         .footer-section li {
//           color: #ccc;
//           margin-bottom: 0.5rem;
//           line-height: 1.6;
//         }
//         .footer-section ul {
//           list-style: none;
//         }
//         .footer-section a {
//           color: #ccc;
//           text-decoration: none;
//           transition: color 0.3s ease;
//         }
//         .footer-section a:hover {
//           color: #667eea;
//         }
//         .footer-bottom {
//           text-align: center;
//           margin-top: 2rem;
//           padding-top: 2rem;
//           border-top: 1px solid #333;
//           color: #999;
//         }
//         .animate-on-scroll {
//           opacity: 0;
//           transform: translateY(50px);
//           transition: all 0.6s ease;
//         }
//         .animate-on-scroll.animated {
//           opacity: 1;
//           transform: translateY(0);
//         }
//         @media (max-width: 768px) {
//           .hero { min-height: 500px; }
//           .hero h1 { font-size: 2.5rem; }
//           .hero p { font-size: 1.1rem; }
//           .section-title { font-size: 1.35rem; }
//           .about-us-title { font-size: 1.8rem; }
//         }
//       `}</style>

//       {/* Header */}
//       <header className="header">
//         <div className="logo">PayAssure</div>
//         <a href="/login" className="login-btn">Login</a>
//       </header>

//       {/* Hero */}
//       <section className="hero">
//         <div className="hero-content">
//           <h1>PayAssure</h1>
//           <p>Your trusted partner in comprehensive insurance solutions</p>
//         </div>
//       </section>

//       {/* About Us Section */}
//       <section className="about-us-section" id="login">
//         <div className="about-us-container animate-on-scroll">
//           <h2 className="about-us-title">About Us</h2>
//           <p>
//             At PayAssure, we specialize in providing seamless and secure payment solutions, leveraging the power of Razorpay’s industry-leading technology. 
//             Our platform is designed to deliver smooth transaction experiences for individuals and businesses alike, ensuring transparency, reliability, and swift processing.
//           </p>
//           <p>
//             With Razorpay integrated into our system, you gain access to a trusted payment gateway that supports multiple payment options including cards, UPI, wallets, and net banking — all protected with top-notch security standards. 
//             We are committed to helping you manage payments effortlessly, enabling you to focus on what matters most.
//           </p>
//           <p>
//             Whether you're paying your insurance premium, renewing policies, or handling claims, PayAssure and Razorpay together provide a secure and user-friendly environment for all your payment needs.
//           </p>
//         </div>
//       </section>

//       {/* Services */}
//       <section className="services">
//         <h2 className="section-title animate-on-scroll">Our Insurance Solutions</h2>
//         <div className="services-grid">
//           <div className="service-card animate-on-scroll">
//             <div className="service-icon">🏠</div>
//             <h3>Home Insurance</h3>
//             <p>Comprehensive protection for your home and belongings with customizable coverage options.</p>
//           </div>
//           <div className="service-card animate-on-scroll">
//             <div className="service-icon">🚗</div>
//             <h3>Auto Insurance</h3>
//             <p>Full coverage auto insurance with competitive rates and 24/7 roadside assistance.</p>
//           </div>
//           <div className="service-card animate-on-scroll">
//             <div className="service-icon">💼</div>
//             <h3>Business Insurance</h3>
//             <p>Tailored business protection plans to safeguard your company's assets and operations.</p>
//           </div>
//           <div className="service-card animate-on-scroll">
//             <div className="service-icon">❤️</div>
//             <h3>Health Insurance</h3>
//             <p>Comprehensive health coverage plans for individuals and families with extensive provider networks.</p>
//           </div>
//           <div className="service-card animate-on-scroll">
//             <div className="service-icon">✈️</div>
//             <h3>Travel Insurance</h3>
//             <p>Complete travel protection including trip cancellation, medical emergencies, and lost luggage.</p>
//           </div>
//           <div className="service-card animate-on-scroll">
//             <div className="service-icon">👥</div>
//             <h3>Life Insurance</h3>
//             <p>Secure your family's financial future with our flexible life insurance policies.</p>
//           </div>
//         </div>
//       </section>

//       {/* Stats */}
//       <section className="stats">
//         <div className="stats-grid">
//           <div className="stat-item animate-on-scroll">
//             <div className="stat-number">500K+</div>
//             <div className="stat-label">Happy Customers</div>
//           </div>
//           <div className="stat-item animate-on-scroll">
//             <div className="stat-number">25+</div>
//             <div className="stat-label">Years of Experience</div>
//           </div>
//           <div className="stat-item animate-on-scroll">
//             <div className="stat-number">99.8%</div>
//             <div className="stat-label">Claims Satisfaction</div>
//           </div>
//           <div className="stat-item animate-on-scroll">
//             <div className="stat-number">24/7</div>
//             <div className="stat-label">Customer Support</div>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="footer">
//         <div className="footer-content">
//           <div className="footer-section">
//             <h3>About PayAssure</h3>
//             <p>PayAssure is a leading insurance company committed to providing comprehensive protection and exceptional service to individuals, families, and businesses across the nation.</p>
//             <p>Founded in 1998, we have been building trust and security for over 25 years.</p>
//           </div>
//           <div className="footer-section">
//             <h3>Our Services</h3>
//             <ul>
//               <li><a href="#">Auto Insurance</a></li>
//               <li><a href="#">Home Insurance</a></li>
//               <li><a href="#">Business Insurance</a></li>
//               <li><a href="#">Health Insurance</a></li>
//               <li><a href="#">Life Insurance</a></li>
//               <li><a href="#">Travel Insurance</a></li>
//             </ul>
//           </div>
//           <div className="footer-section">
//             <h3>Customer Support</h3>
//             <ul>
//               <li>📞 1-800-PAYASSURE</li>
//               <li>✉️ support@payassure.com</li>
//               <li>💬 Live Chat Available 24/7</li>
//               {/* <li>🏢 Claims Processing</li> */}
//               <li>📄 Policy Management</li>
//               <li>❓ FAQ & Help Center</li>
//             </ul>
//           </div>
//           <div className="footer-section">
//             <h3>Company Info</h3>
//             <ul>
//               <li>📍 123 Insurance Plaza<br/>Bengaluru, Karnataka</li>
//               <li>🏆 A+ Rated by AM Best</li>
//               {/* <li>🔒 FDIC Insured</li> */}
//               <li>📊 Publicly Traded (NYSE: PAYR)</li>
//               <li>🌍 Licensed in all 50 states</li>
//               <li>👥 Over 10,000 employees</li>
//             </ul>
//           </div>
//         </div>
//         <div className="footer-bottom">
//           <p>
//             &copy; 2025 PayAssure Insurance Company. All rights reserved. | Privacy Policy | Terms of Service | Accessibility
//           </p>
//         </div>
//       </footer>
//     </>
//   );
// }
