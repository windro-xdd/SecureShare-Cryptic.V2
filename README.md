# SecureShare 🛡️

### A zero-knowledge, end-to-end encrypted file sharing application that works entirely in your browser.

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

*SecureShare is a portfolio project demonstrating advanced client-side cryptography, modern web architecture, and a focus on user privacy.*

> **Note:** You can add a GIF of the application flow here to make your portfolio even more impressive!
> `![SecureShare Demo](link-to-your-demo.gif)`

## The Problem 🤔

Sharing sensitive files online often means trusting a third-party service with your data. Many platforms lack true end-to-end encryption, creating privacy and security risks. Users need a way to share files that is quick, private, and secure, without the friction of creating an account.

## The Solution 💡

SecureShare solves this by performing all cryptographic operations **directly in the browser** using the standard Web Crypto API. The server is a "zero-knowledge" host—it only stores encrypted data blobs that it cannot read. The decryption key is never sent to the server, ensuring that only the sender and the intended recipient can ever access the file's contents.

## Key Features ✨

-   🔐 **End-to-End Encryption (E2EE):** Files are encrypted in the browser before upload and decrypted after download.
-   🙈 **Zero-Knowledge Architecture:** The server has no access to the unencrypted files or the decryption keys.
-   🚀 **No Account Required:** Share files instantly without the friction of signing up or logging in.
-   ⚙️ **Access Control Policies:**
    -   **Expiration Time:** Links automatically become invalid after a set duration (1, 6, or 24 hours).
    -   **Download Limit:** Links are disabled after a specified number of downloads.
-   🎨 **Personalized Theming:** The sender's chosen accent color is embedded in the share link for a personalized recipient experience.

## How It Works: The Security Flow 🔐

The application's security model is built on a robust cryptographic flow that ensures data privacy at every step.

1.  **File Selection:** The sender selects a file in their browser.
2.  **Client-Side Key Generation:** The browser generates two crucial pieces of data:
    -   A strong, random `File Key` (AES-256-GCM) to encrypt the file.
    -   A human-readable `Download Code`.
3.  **Key Derivation:** The `Download Code` is combined with a random `Salt` and processed with a Key Derivation Function (PBKDF2) to create a **Key Encrypting Key (KEK)**. This makes brute-force attacks computationally expensive.
4.  **Encryption & Wrapping:**
    -   The `File Key` encrypts the file's content, producing the **Ciphertext**.
    -   The `KEK` encrypts the `File Key`, producing a **Wrapped File Key**.
5.  **Upload to Server:** The browser uploads the **Ciphertext** to Supabase Storage and the **Wrapped File Key**, `Salt`, and other metadata to the Supabase Database.
    > **Important:** The `Download Code` and the original `File Key` are **never** sent to the server.
6.  **Decryption by Recipient:**
    -   The recipient opens the download link. The `Download Code` is in the URL fragment (`#CODE`), which browsers do not send to servers.
    -   The browser fetches the encrypted metadata and re-derives the `KEK`.
    -   The `KEK` unwraps the `File Key`.
    -   The browser downloads the `Ciphertext` and uses the unwrapped `File Key` to decrypt it, delivering the original file to the user.

## Tech Stack & Architecture 🚀

-   **Framework:** React with Vite and TypeScript for a fast, modern, and type-safe development experience.
-   **Backend-as-a-Service (BaaS):** Supabase provides the backend infrastructure.
    -   **Supabase Storage:** Stores the encrypted file blobs.
    -   **Supabase Database (Postgres):** Stores file metadata and the wrapped encryption key.
    -   **Supabase Edge Functions:** A serverless function handles the atomic increment of the download count, preventing race conditions.
-   **Cryptography:** The browser's native **Web Crypto API** (AES-GCM, PBKDF2) ensures high performance and security without external dependencies.
-   **Styling:** **Tailwind CSS** with a dynamic CSS variable system for rapid UI development and a powerful theming system.
-   **State Management:** **TanStack Query** for server state and React hooks for local UI state.

## Running Locally 💻

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Start the development server: `npm run dev`

> *Note: You will need to set up your own Supabase project and configure the environment variables in `src/integrations/supabase/client.ts` for the application to connect to the backend.*

## Future Enhancements 🌟

-   **Password Protection:** Add an optional password field for an extra layer of security.
-   **Large File Support:** Implement file chunking to support files larger than browser memory limits.
-   **User Accounts:** Introduce optional user accounts (using Supabase Auth) to manage shared files and track history.