# Font Swap
> **Live Font Preview & Replacement Tool**

[Live Demo](https://fontswap.twaites.com)

Font Swap is a powerful developer tool that allows you to instantly preview and swap Google Fonts on any live websites. Analyze typography, test new font combinations, and visualize changes in real-time without writing a single line of CSS.



## Features
*   **Live URL Proxy**: Load any website (handling CORS and rewriting assets automatically).
*   **Font Detection**: Automatically identifies all fonts currently used on the page.
*   **Smart Swapping**: Swap any detected font with the entire Google Fonts library.
*   **Advanced Filtering**: Sort fonts by Popularity, Trending, Newest, or Name. Filter by categories (Serif, Sans-serif, etc.).
*   **Link Interception**: Automatically disables link navigation within the preview to keep the focus on typography.
*   **Performance Optimized**: Caches font data and lazy-loads font styles for maximum speed.
*   **Security**: Validates URLs, blocks IP addresses, and prevents malicious navigation.

## Getting Started

Follow these steps to run Font Swap locally.

### Prerequisites
*   Node.js (v18 or higher)
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/twaites/font-swap.git
    cd font-swap
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your Google Fonts API Key.
    ```bash
    # Get a key at https://developers.google.com/fonts/docs/developer_api
    GOOGLE_FONT_API_KEY=your_api_key_here
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Technology Stack
*   **Framework**: Next.js 16 (App Router)
*   **Styling**: TailwindCSS
*   **Proxy Logic**: Custom implementation for HTML/CSS rewriting and asset handling.
*   **Icons**: Lucide React
*   **Components**: Key primitives from Radix UI.

## License
Distributed under the MIT License. See `LICENSE` for more information.
