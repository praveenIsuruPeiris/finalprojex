export default function Footer() {
    return (
      <footer className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 p-4">
        <div className="max-w-screen-xl mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Projex. All rights reserved.</p>
        </div>
      </footer>
    );
  }
  