import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-md p-2 flex-shrink-0">
      <div className="flex justify-center items-center max-w-7xl mx-auto gap-12">
        {/* Increased logo heights */}
        <img src="/images/USS.png" alt="USS Vision Logo" style={{ height: "130px" }} />
        <img src="/images/Ford.png" alt="Ford Logo" style={{ height: "65px" }} />
      </div>
    </header>
  );
};

export default Header; 