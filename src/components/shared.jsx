// Shared Components - Navbar, Layout, UI Elements
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

// ============================================================================
// NAVBAR WITH THEME TOGGLE
// ============================================================================
export function Navbar({ theme, toggleTheme }) {
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth <= 768 : false
    );
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            // Close menu when switching to desktop
            if (!mobile) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const links = [
        { to: "/", label: "Home" },
        { to: "/dashboard", label: "Choose Your Goal" },
        { to: "/portfolio", label: "Compare Mechanisms" },
        { to: "/treaty-advisor", label: "Treaty Advisor" },
        { to: "/framework", label: "Framework" },
        { to: "/crowdsource", label: "Submit" },
    ];

    return (
        <nav
            id="navbar-root"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                minHeight: "64px",
                background: theme === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 0, 0, 0.9)',
                backdropFilter: "blur(20px)",
                borderBottom: theme === 'light' ? '1px solid #E7E5E4' : '1px solid rgba(255,255,255,0.06)',
                padding: "8px 16px",
                zIndex: 9999,
                transition: "all 0.3s ease",
                boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 20px var(--accent)",
                }} />
                <span style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "var(--text)",
                }}>VMFS</span>
                </div>

                {/* Desktop nav links */}
                {!isMobile && (
                    <div style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                        flex: 1,
                        minWidth: 0,
                        flexWrap: "wrap",
                    }}>
                        {links.map(link => {
                            const isActive = location.pathname === link.to ||
                                (link.to !== "/" && location.pathname.startsWith(link.to));
                            const isHome = link.to === "/" && location.pathname === "/";
                            const active = isActive || isHome;

                            return (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "20px",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: active ? "var(--text)" : "var(--text-secondary)",
                                        background: active
                                            ? (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)')
                                            : "transparent",
                                        textDecoration: "none",
                                        transition: "all 0.2s var(--ease)",
                                    }}
                                >
                                    {link.label}
                                </NavLink>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "999px",
                            border: theme === 'light' ? '1px solid #E7E5E4' : '1px solid rgba(255,255,255,0.15)',
                            background: theme === 'light' ? '#F5F5F4' : 'rgba(255,255,255,0.06)',
                            color: "var(--text)",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "background 0.25s var(--ease), transform 0.2s var(--ease), border-color 0.25s var(--ease)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        }}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        <span
                            style={{
                                position: "relative",
                                width: 22,
                                height: 22,
                                borderRadius: "999px",
                                overflow: "hidden",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: theme === 'light'
                                    ? 'rgba(0,0,0,0.04)'
                                    : 'rgba(255,255,255,0.08)',
                                transition: "background 0.25s var(--ease)",
                            }}
                        >
                            {/* Moon icon (dark mode target) */}
                            <span
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: theme === 'light' ? 1 : 0,
                                    transform: theme === 'light'
                                        ? "translateY(0) scale(1)"
                                        : "translateY(-8px) scale(0.8)",
                                    transition: "opacity 0.25s var(--ease), transform 0.25s var(--ease)",
                                }}
                            >
                                🌙
                            </span>
                            {/* Modern sun/glow icon for light mode */}
                            <span
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: theme === 'light' ? 0 : 1,
                                    transform: theme === 'light'
                                        ? "translateY(8px) scale(0.8)"
                                        : "translateY(0) scale(1)",
                                    transition: "opacity 0.25s var(--ease), transform 0.25s var(--ease)",
                                }}
                            >
                                🔆
                            </span>
                        </span>
                        <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {theme === 'light' ? 'Dark' : 'Light'}
                        </span>
                    </button>

                    {/* Mobile menu toggle */}
                    {isMobile && (
                        <button
                            onClick={() => setIsMenuOpen(open => !open)}
                            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                border: theme === 'light' ? '1px solid #E7E5E4' : '1px solid rgba(255,255,255,0.2)',
                                background: theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            <span style={{
                                display: "block",
                                width: 18,
                                height: 2,
                                background: "var(--text)",
                                position: "relative",
                                transition: "all 0.2s ease",
                                transform: isMenuOpen ? "rotate(45deg)" : "none",
                            }}>
                                <span style={{
                                    content: '""',
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    background: "var(--text)",
                                    top: isMenuOpen ? 0 : -6,
                                    opacity: isMenuOpen ? 0 : 1,
                                    transition: "all 0.2s ease",
                                }} />
                                <span style={{
                                    content: '""',
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    background: "var(--text)",
                                    top: isMenuOpen ? 0 : 6,
                                    transform: isMenuOpen ? "rotate(-90deg)" : "none",
                                    transition: "all 0.2s ease",
                                }} />
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {isMobile && isMenuOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: theme === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(0,0,0,0.98)',
                    borderBottom: theme === 'light' ? '1px solid #E7E5E4' : '1px solid rgba(255,255,255,0.06)',
                    padding: "8px 16px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                }}>
                    {links.map(link => {
                        const isActive = location.pathname === link.to ||
                            (link.to !== "/" && location.pathname.startsWith(link.to));
                        const isHome = link.to === "/" && location.pathname === "/";
                        const active = isActive || isHome;

                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsMenuOpen(false)}
                                style={{
                                    padding: "10px 8px",
                                    borderRadius: "10px",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: active ? "var(--text)" : "var(--text-secondary)",
                                    background: active
                                        ? (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)')
                                        : "transparent",
                                    textDecoration: "none",
                                    transition: "all 0.2s var(--ease)",
                                }}
                            >
                                {link.label}
                            </NavLink>
                        );
                    })}
                </div>
            )}
        </nav>
    );
}

// ============================================================================
// LAYOUT WRAPPER
// ============================================================================
export function Layout({ children, theme, toggleTheme }) {
    const [navHeight, setNavHeight] = useState(64);

    useEffect(() => {
        const updateNavHeight = () => {
            const el = document.getElementById("navbar-root");
            if (el) {
                setNavHeight(el.offsetHeight);
            }
        };

        updateNavHeight();
        window.addEventListener("resize", updateNavHeight);
        return () => window.removeEventListener("resize", updateNavHeight);
    }, []);

    return (
        <div style={{ paddingTop: navHeight, minHeight: "100vh" }}>
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            {children}
        </div>
    );
}

// ============================================================================
// BENTO CARD
// ============================================================================
export function BentoCard({ children, className = "", style = {}, onClick, hoverable = true }) {
    return (
        <div
            onClick={onClick}
            className={`glass ${className}`}
            style={{
                borderRadius: "24px",
                padding: "24px",
                transition: "all 0.3s var(--ease)",
                cursor: onClick ? "pointer" : "default",
                ...style,
            }}
            onMouseEnter={(e) => {
                if (hoverable) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                }
            }}
            onMouseLeave={(e) => {
                if (hoverable) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "var(--border)";
                }
            }}
        >
            {children}
        </div>
    );
}

// ============================================================================
// ANIMATED NUMBER
// ============================================================================
export function AnimatedNumber({ value, decimals = 1, duration = 800, suffix = "" }) {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseFloat(value);
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) {
                setDisplay(end);
                clearInterval(timer);
            } else {
                setDisplay(start);
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{display.toFixed(decimals)}{suffix}</span>;
}


// ============================================================================
// SECTION HEADER
// ============================================================================
export function SectionHeader({ label, title, subtitle }) {
    return (
        <div style={{ marginBottom: "32px" }}>
            {label && (
                <div style={{
                    fontSize: "12px",
                    color: "var(--accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "8px",
                }}>
                    {label}
                </div>
            )}
            <h2 style={{
                fontSize: "36px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: subtitle ? "8px" : 0,
                color: "var(--text)",
            }}>
                {title}
            </h2>
            {subtitle && (
                <p style={{
                    fontSize: "16px",
                    color: "var(--text-secondary)",
                    maxWidth: "600px",
                    lineHeight: 1.6,
                }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}

// ============================================================================
// BUTTON
// ============================================================================
export function Button({ children, variant = "primary", onClick, style = {} }) {
    const variants = {
        primary: {
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
        },
        secondary: {
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
        },
        ghost: {
            background: "rgba(255,255,255,0.05)",
            color: "var(--text-secondary)",
            border: "none",
        },
    };

    return (
        <button
            onClick={onClick}
            style={{
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s var(--ease)",
                fontFamily: "inherit",
                ...variants[variant],
                ...style,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                if (variant === "primary") {
                    e.currentTarget.style.boxShadow = "0 4px 20px var(--accent-glow)";
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            {children}
        </button>
    );
}

// ============================================================================
// SCORE BAR
// ============================================================================
export function ScoreBar({ value, max = 5, color = "var(--accent)", label, showValue = true }) {
    return (
        <div style={{ marginBottom: "12px" }}>
            {(label || showValue) && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    {label && <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{label}</span>}
                    {showValue && <span style={{ fontSize: "13px", fontFamily: "var(--mono)", color }}>{value.toFixed(1)}</span>}
                </div>
            )}
            <div style={{
                height: "6px",
                background: "var(--bg-card)",
                borderRadius: "3px",
                overflow: "hidden",
            }}>
                <div style={{
                    height: "100%",
                    width: `${(value / max) * 100}%`,
                    background: color,
                    borderRadius: "3px",
                    transition: "width 0.4s var(--ease)",
                }} />
            </div>
        </div>
    );
}

// ============================================================================
// BADGE
// ============================================================================
export function Badge({ children, variant = "default" }) {
    const variants = {
        default: { background: "var(--bg-card)", color: "var(--text-secondary)" },
        accent: { background: "rgba(50, 215, 75, 0.15)", color: "var(--green)" },
        blue: { background: "rgba(10, 132, 255, 0.15)", color: "var(--blue)" },
        warning: { background: "rgba(255, 159, 10, 0.15)", color: "var(--orange)" },
        danger: { background: "rgba(255, 69, 58, 0.15)", color: "var(--red)" },
    };

    return (
        <span style={{
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 500,
            display: "inline-block",
            ...variants[variant],
        }}>
            {children}
        </span>
    );
}