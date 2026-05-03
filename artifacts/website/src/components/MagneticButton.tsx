import { ReactNode, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface MagneticState {
  x: number;
  y: number;
}

function useMagneticEffect<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);
  const currentRef = useRef<MagneticState>({ x: 0, y: 0 });
  const targetRef = useRef<MagneticState>({ x: 0, y: 0 });
  const isHoveredRef = useRef(false);

  const magneticStrength = 0.15;
  const damping = 0.92;
  const textParallaxFactor = 0.3;
  const deadZone = 15;
  const threshold = 0.1;

  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * (1 - factor);
  };

  const animate = useCallback(() => {
    const current = currentRef.current;
    const target = targetRef.current;

    current.x = lerp(current.x, target.x, damping);
    current.y = lerp(current.y, target.y, damping);

    const dx = Math.abs(target.x - current.x);
    const dy = Math.abs(target.y - current.y);

    if (elementRef.current) {
      elementRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
    }

    if (textRef.current) {
      const textX = current.x * textParallaxFactor;
      const textY = current.y * textParallaxFactor;
      textRef.current.style.transform = `translate3d(${textX}px, ${textY}px, 0)`;
    }

    if (dx > threshold || dy > threshold || isHoveredRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (elementRef.current) {
        elementRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
      if (textRef.current) {
        textRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
      animationRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (animationRef.current === null) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!elementRef.current || !isHoveredRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const distanceX = mouseX - centerX;
    const distanceY = mouseY - centerY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (distance < deadZone) {
      targetRef.current = { x: 0, y: 0 };
    } else {
      targetRef.current = {
        x: distanceX * magneticStrength,
        y: distanceY * magneticStrength,
      };
    }

    const relativeX = ((mouseX - rect.left) / rect.width) * 100;
    const relativeY = ((mouseY - rect.top) / rect.height) * 100;
    
    elementRef.current.style.setProperty('--mouse-x', `${relativeX}%`);
    elementRef.current.style.setProperty('--mouse-y', `${relativeY}%`);

    startAnimation();
  }, [startAnimation]);

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    isHoveredRef.current = true;
    
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
      const relativeY = ((e.clientY - rect.top) / rect.height) * 100;
      
      elementRef.current.style.setProperty('--mouse-x', `${relativeX}%`);
      elementRef.current.style.setProperty('--mouse-y', `${relativeY}%`);
      elementRef.current.setAttribute('data-hover', 'true');
    }
    
    startAnimation();
  }, [startAnimation]);

  const handleMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    targetRef.current = { x: 0, y: 0 };
    
    if (elementRef.current) {
      elementRef.current.removeAttribute('data-hover');
    }
    
    startAnimation();
  }, [startAnimation]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleMouseEnter, handleMouseLeave, handleMouseMove]);

  return { elementRef, textRef };
}

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'lg';
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function MagneticButton({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'default', 
  href,
  onClick, 
  type = 'button', 
  disabled 
}: MagneticButtonProps) {
  const [, navigate] = useLocation();
  const { elementRef, textRef } = useMagneticEffect<HTMLAnchorElement | HTMLButtonElement>();
  
  const baseStyles = cn(
    'magnetic-btn relative inline-flex items-center justify-center',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'overflow-hidden cursor-pointer no-underline',
    {
      'text-sm': size === 'default',
      'text-base': size === 'lg',
    },
    {
      'magnetic-btn-primary': variant === 'primary',
      'magnetic-btn-secondary': variant === 'secondary',
    },
    disabled && 'pointer-events-none opacity-50',
    className
  );

  const content = (
    <>
      <span className="magnetic-btn-fill" aria-hidden="true" />
      <span 
        ref={textRef} 
        className="magnetic-btn-text relative z-10 flex items-center gap-2"
      >
        {children}
      </span>
    </>
  );

  if (href) {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(href);
    };

    return (
      <a
        ref={elementRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        onClick={handleClick}
        className={baseStyles}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={elementRef as React.RefObject<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseStyles}
    >
      {content}
    </button>
  );
}
