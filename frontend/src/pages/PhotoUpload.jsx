import React, { useState } from 'react';
import { uploadPhoto } from '../api/client';

const PhotoUpload = () => {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (file) {
      const res = await uploadPhoto(file);
      setResponse(res);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">Upload</button>
      </form>
      {response && (
        <div className="mt-4">
          <h3 className="font-bold">Analysis Result</h3>
          <p>Species: {response.species}</p>
          <p>Confidence: {response.confidence}</p>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
