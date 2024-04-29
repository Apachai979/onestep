'use client'
import { useState } from 'react';

const Tabs = ({ children }) => {
    const [activeTab, setActiveTab] = useState(children[0].props.label);

    const handleClick = (e, newActiveTab) => {
        e.preventDefault();
        setActiveTab(newActiveTab);
    };

    return (
        <div className="max-w-5xl mt-6 mb-10">
            <div className="flex translate-y-[1px]">
                {children.map(child => (
                    <button
                        key={child.props.label}
                        className={`${activeTab === child.props.label ? 'border border-b-white border-t-4 border-t-primary_green border-l-gray-1000 border-r-gray-300 bg-white text-dark_green' : 'border border-b-gray-300 border-t-0 border-r-0 border-l-0'
                            } flex-1 text-night_green text-md font-semibold py-2 px-3 `}
                        onClick={e => handleClick(e, child.props.label)}
                    >
                        {child.props.label}
                    </button>
                ))}
            </div>
            <div className="">
                {children.map((child) => {
                    if (child.props.label === activeTab) {
                        return <div className='px-8 bg-white border-t-0 border border-gray-300 animate-scale' key={child.props.label}>{child.props.children}</div>;
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

const Tab = ({ label, children }) => {
    return (
        <div label={label} className="hidden">
            {children}
        </div>
    );
};
export { Tabs, Tab };