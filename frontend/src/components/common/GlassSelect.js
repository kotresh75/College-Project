import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

const GlassSelect = ({
    options,
    value,
    onChange,
    placeholder,
    icon: Icon,
    className,
    style, // Add style prop
    showSearch = true,
    small = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideTrigger = triggerRef.current && triggerRef.current.contains(event.target);
            const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

            if (!isInsideTrigger && !isInsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper: Update Position
    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Open/Close handlers
    const toggleOpen = () => {
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Update position on scroll/resize when open
    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Focus search input
    useEffect(() => {
        if (isOpen && showSearch && searchInputRef.current) {
            setTimeout(() => searchInputRef.current.focus(), 50);
        }
        if (!isOpen) {
            setTimeout(() => setSearch(''), 200);
        }
    }, [isOpen, showSearch]);

    const selectedOption = options.find(opt => opt.value === value);
    const filteredOptions = showSearch
        ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const dropdownContent = (
        <div
            className="glass-dropdown-menu"
            ref={dropdownRef}
            style={{
                position: 'absolute',
                top: position.top + 8,
                left: position.left,
                width: position.width,
                zIndex: 99999,
                margin: 0
            }}
        >
            {/* Search Bar */}
            {showSearch && (
                <div className="dropdown-search">
                    <div className="dropdown-search-inner">
                        <Search size={14} className="mr-2" style={{ color: 'var(--text-secondary)' }} />
                        <input
                            ref={searchInputRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="dropdown-search-input"
                        />
                    </div>
                </div>
            )}

            <div className="overflow-y-auto" style={{ flex: 1, maxHeight: '200px' }}>
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                        <div
                            key={option.value}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`dropdown-option ${option.value === value ? 'selected' : ''}`}
                            style={option.style} // Allow passing custom styles (e.g. colors)
                        >
                            {option.label}
                        </div>
                    ))
                ) : (
                    <div className="dropdown-empty">
                        No options found
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div
                className={`glass-select-container ${className || ''} ${small ? 'small' : ''}`}
                ref={triggerRef}
                onClick={toggleOpen}
                style={{ height: small ? '32px' : undefined, ...style }}
            >
                <div className={`glass-select-trigger glass-input ${Icon ? 'with-icon' : ''}`} style={{ padding: small ? '4px 8px' : undefined, height: '100%', fontSize: small ? '0.85rem' : undefined }}>
                    {Icon && <Icon className="glass-select-icon" size={small ? 14 : 18} />}
                    <span
                        className={`glass-select-placeholder ${selectedOption ? 'selected' : ''} truncate`}
                        style={{ color: selectedOption?.color || undefined }} // Allow trigger text color
                    >
                        {selectedOption ? selectedOption.label : placeholder || 'Select...'}
                    </span>
                    <ChevronDown
                        size={small ? 14 : 16}
                        className={`transition ${isOpen ? 'rotate-180' : ''}`}
                        style={{ color: 'var(--text-secondary)', minWidth: '16px' }}
                    />
                </div>
            </div>

            {/* Portal Rendering */}
            {isOpen && ReactDOM.createPortal(dropdownContent, document.body)}
        </>
    );
};

export default GlassSelect;
