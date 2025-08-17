# SecureShare - End-to-End Encrypted File Sharing

SecureShare is a zero-knowledge, browser-based web application that provides secure, end-to-end encrypted file sharing with expiring links and download limits.

## The Problem

Sharing sensitive files online often requires trusting a third-party service with your data. Many platforms lack end-to-end encryption, meaning the service provider can access the files. This poses a significant privacy and security risk. Users need a way to share files that is quick, private, and secure, without requiring account creation or complex software.

## The Solution

SecureShare solves this by performing all encryption and decryption operations directly in the browser using the standard Web Crypto API. The server is a "zero-knowledge" host—it only stores encrypted data blobs that it cannot read. The decryption key (the "download code") is never sent to the server, ensuring that only the sender and the intended recipient can access the file's contents.

## Key Features

-   **End-to-End Encryption (E2EE):** Files are encrypted in the browser before upload and decrypted in the browser after download.
-   **Zero-Knowledge Architecture:** The server has no access to the unencrypted files or the decryption keys.
-   **No Account Required:** Share files instantly without the friction of signing up or logging in.
-   **Access Control Policies:**
    -   **Expiration Time:** Links automatically become invalid after a set duration (1, 6, or 24 hours).
    -   **Download Limit:** Links are disabled after a specified number of downloads.
-   **Secure Link Generation:** Creates a unique, hard-to-guess download link containing the secret decryption code.
-   **Personalized Theming:** The sender's chosen accent color is embedded in the share link, creating a personalized and consistent experience for the recipient.

## How It Works: The Security Flow

The application's security model is built on a robust cryptographic flow that ensures data privacy at every step.

1.  **File Selection:** The sender selects a file in their browser.
2.  **Client-Side Key Generation:** The browser generates two crucial pieces of data:
    -   A strong, random **File Key** (AES-256-GCM) to encrypt the file.
    -   A human-readable **Download Code**.
3.  **Key Derivation:** The Download Code is combined with a random **Salt** and processed with a Key Derivation Function (PBKDF2) to create a **Key Encrypting Key (KEK)**. This makes brute-force attacks on the Download Code computationally expensive.
4.  **Encryption & Wrapping:**
    -   The **File Key** encrypts the file's content, producing the **Ciphertext**.
    -   The **KEK** encrypts the **File Key**, producing a **Wrapped File Key**.
5.  **Upload to Server:** The browser uploads the **Ciphertext** to Supabase Storage and the **Wrapped File Key**, **Salt**, and other metadata (like expiration rules) to the Supabase Database. **The Download Code and the original File Key are never sent to the server.**
6.  **Decryption by Recipient:**
    -   The recipient opens the download link. The **Download Code** is in the URL fragment (`#CODE`), which is not sent to the server.
    -   The browser fetches the metadata (including the Wrapped File Key and Salt) from the server.
    -   It re-derives the **KEK** using the Download Code from the URL and the fetched Salt.
    -   The KEK unwraps the File Key.
    -   The browser downloads the Ciphertext and uses the unwrapped File Key to decrypt it, delivering the original file to the user.

## Tech Stack & Architecture

-   **Framework:** React with Vite and TypeScript for a fast, modern, and type-safe development experience.
-   **Backend-as-a-Service (BaaS):** Supabase provides the backend infrastructure.
    -   **Supabase Storage:** Stores the encrypted file blobs.
    -   **Supabase Database (Postgres):** Stores file metadata (filename, size, expiration) and the wrapped encryption key.
    -   **Supabase Edge Functions:** A serverless function handles the atomic increment of the download count, preventing race conditions and ensuring download limits are strictly enforced.
-   **Cryptography:** The browser's native **Web Crypto API** is used for all cryptographic operations (AES-GCM, PBKDF2), ensuring high performance and security without external dependencies.
-   **Styling:** **Tailwind CSS** with a dynamic CSS variable system enables rapid UI development and a powerful, persistent theming system.
-   **State Management:** A combination of **TanStack Query** for server state management (caching, fetching) and React's built-in hooks for local UI state.

## Running Locally

To run this project locally, follow these steps:

1.  Clone the repository.
2.  Install dependencies with `npm install`.
3.  Start the development server with `npm run dev`.

*Note: You will need to set up your own Supabase project and configure the environment variables in `src/integrations/supabase/client.ts` for the application to connect to the backend.*

## Future Enhancements

-   **Password Protection:** Add an optional password field to be mixed into the key derivation for an extra layer of security.
-   **Large File Support:** Implement file chunking to allow for the encryption and upload of files larger than browser memory limits.
-   **User Accounts:** Introduce an optional user account system (using Supabase Auth) for users who wish to manage their shared files and track download history.