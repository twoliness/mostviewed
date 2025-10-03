const ComingSoon = ({ title = "Coming Soon" }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-25 via-white to-rose-25">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1>
          <p className="text-gray-600">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;