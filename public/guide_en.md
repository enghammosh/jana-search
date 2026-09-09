# **Janna Dani Application User Guidlines**

Welcome to the Jana Al-Dani application\! This application is designed to be a fast and easy-to-use reference for searching the legacy of the Hadith scholar, Sheikh Muhammad Nasir al-Din al-Albani (may Allah have mercy on him). It allows you to browse, search, save, and share Hadiths, along with advanced Artificial Intelligence tools for a deeper understanding.

This guide will explain all the app's features simply.

## **1\. Basic Navigation & Reading**

The app is divided into three main sections accessible from the top navigation bar:

* 🔍 **Main Search:** The default screen for searching the database and viewing results.  
* 📚 **Library:** Allows you to browse all available books and read Hadiths sequentially (chapter by chapter).  
* 💖 **My Groups:** Here you will find the custom folders you created to save your favorite Hadiths.

### **How to read a book from the Library?**

1. Click the 📚 **Library** icon.  
2. Select the book you wish to read from the list.  
3. In reading mode, use the ➔ **Next** and ⬅ **Previous** buttons at the bottom to navigate through the Hadiths.  
4. The app smartly remembers your scroll position. If you read a Hadith and return to the library, you will find yourself in the exact same spot\!

## **2\. Search Capabilities & Filtering**

The app offers a highly advanced search bar (🔍) featuring three modes:

* **Normal Search (🔍):** Instant and extremely fast exact matching of the letters you type. Perfect when looking for a specific word or narrator.  
* **Smart Search (✨):** (Requires AI activation \- see Section 6). Type a general topic (e.g., "Honoring Parents"). The AI will extract relevant keywords and linguistic roots related to the topic and search on your behalf.  
* **Fatwa & Q\&A (💬):** (Requires AI activation). Ask a religious or Fiqh question (e.g., "What is the ruling on missing prayer?"). The smart assistant will find relevant Hadiths and craft a comprehensive Islamic answer based **only** on those Hadiths, allowing you to chat and discuss further\!

### **Filtering Results 🎛️**

Next to the search bar, you will find a **Filter** button. Click it to:

* **Hadith Status:** Choose to display "Accepted" (Sahih, Hasan..) or "Rejected" (Da'if, Mawdu'..) Hadiths.  
* **Select Sources:** Narrow your search to one or multiple specific books.

## **3\. Interacting with Hadiths**

When a Hadith card appears in the search results or library, you will find a set of icons at the bottom of each card to interact with it:

* **Expand:** Click anywhere on the empty space of the Hadith card to open it in a large popup window for comfortable reading.  
* 🔖 **Save (BookmarkPlus):** Saves the Hadith to one of "My Groups". Upon saving, the icon changes to ☑️ (BookmarkCheck).  
* 📋 **Copy (Copy):** Copies the entire text of the Hadith, along with its source and grading, to your clipboard to paste anywhere.  
* 🔗 **Share (Share2):** Opens your phone's native sharing menu (WhatsApp, Telegram, etc.) to send the Hadith directly. (If your browser doesn't support this, it will automatically copy the text instead).  
* 🖨️ **Print (Printer):** Sends this specific Hadith to the printer, formatted elegantly for easy reading.

### **Multi-Selection**

You can select multiple Hadiths at once to copy or print them together:

1. Click the **Select (ListChecks)** button next to the search bar.  
2. Click on the desired Hadiths (a checkmark ☑️ will appear next to them).  
3. A bar will appear at the bottom of the screen with **Copy** and **Print** buttons to execute the action on all selected Hadiths simultaneously.

## **4\. Managing Groups (My Groups)**

Everything is saved **locally on your device** (Offline, and will only be deleted if you clear your browser data).

### **To create a group or add a Hadith:**

1. Click the 🔖 **Save** icon below any Hadith.  
2. A window will appear: Either click on an existing group name to add it there, or type a new name at the bottom and click **"Create and Save"**.

### **To manage your groups (Edit / Delete):**

Go to the 💖 **My Groups (FolderHeart)** section from the top menu. You will see all your folders. Click any folder to open it (you can search and filter within it\!).

Below each folder on the outside, you will find icons:

* ✏️ **Rename (Edit2):** To change the group's name.  
* 📑 **Duplicate (Copy):** To create an exact copy of the group and all its Hadiths.  
* 🗑️ **Delete (Trash2):** To permanently delete the group.

## **5\. Advanced AI Features**

If you have activated the AI API Key (explained in the next section), powerful extra buttons will appear next to the Hadiths:

* ✨ **Smart Explanation (Sparkles):** Click it, and the smart assistant will provide a simplified, brief explanation of the Hadith's meanings and extract derived benefits in an easy style.  
* 🌐 **Professional Translation (Languages):** Provides an accurate English translation of the Arabic Hadith, carefully maintaining the Islamic context and terminology.

*(Transparency Note: Whenever an AI feature is used, you will always see a small, transparent text at the bottom of the window indicating the model used, e.g., Powered by: API: gemini-3.6-flash).*

## **6\. AI Setup & API Key Configuration**

For the AI features (Smart Search, Fatwa, Explanation, Translation) to work, the app must connect to Google's Gemini engine.

**Your Security First:** The app saves your key permanently and securely *only locally on your device* (LocalStorage). It is never sent to us or any third party, except directly to Google's servers to fetch the answer.

### **How do I get a free key and install it?**

1. Open the side menu (☰) and click on the ⚙️ **AI Settings** icon.  
2. Inside the window, you will find a blue link titled Google AI Studio website. Click it.  
3. Sign in with your Google account.  
4. Look for the **"Get API Key"** or **"Create API Key"** button, and generate a new key.  
5. Copy the long text string.  
6. Return to our app, and paste the key into the designated field inside the Settings ⚙️.

### **Model Selection & Pricing (Tokens)**

The dropdown menu in the Settings offers several AI model choices. Google provides a Free Tier for developers and users. Here is the breakdown:

* gemini-3.6-flash **(Recommended):** The newest and best. Extremely fast and smart; it is the current standard. Token cost is moderate.  
* gemini-3.5-flash: The previous generation, stable and good. Costs are roughly identical to 3.6.  
* gemini-3.5-flash-lite: **(Least Tokens / Most Economical):** A very light and ultra-fast model. Consumes the least amount of tokens. Excellent if you use the app heavily and fear running out of your free limits.  
* gemini-3.1-pro-preview: **(Smartest & Most Expensive Tokens):** An advanced model for deep reasoning and complex analysis. Consumes the highest tokens and its free daily limits are much lower. Use it only for highly complex questions.

Select a model, click **"Save and Close"**, and enjoy all the AI features\!

## **7\. Additional Display Features**

* 📱 **Offline Mode (PWA Install):** The app supports offline functionality\! On your phone, a prompt will suggest "Add to Home Screen" (Install PWA). Do this, and the app will function like a native phone app even without the internet (except for AI features which require a connection).  
* 🌙 **Dark Mode:** Click the Moon / Sun icon at the top to toggle between comfortable light and dark themes.  
* 🔎 **Font Size:** Use the Zoom-In (⊕) and Zoom-Out (⊖) icons at the top to adjust the reading font size to your comfort. The size will apply throughout the entire app.

