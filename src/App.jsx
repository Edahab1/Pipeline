import React, { useState, useEffect } from "react";
import API from "../pipeline.json"; // Assuming your data is stored in pipeline.json
import * as XLSX from "xlsx"; // Import the xlsx library

export default function App() {
  const [spareSelected, setSpareSelected] = useState(null);
  const [sizeSelected, setSizeSelected] = useState(null);
  const [ratingSelected, setRatingSelected] = useState(null);
  const [scheduleSelected, setScheduleSelected] = useState(null);
  const [addedItems, setAddedItems] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [position, setPosition] = useState("");
  const [assetTag, setAssetTag] = useState(""); // State for Asset Tag
  const [existingFile, setExistingFile] = useState(null); // State to store the uploaded file

  const types = Object.keys(API); // Assuming your categories are the keys in the pipeline.json

  const handleSpare = (event) => {
    const selectedSpare = event.target.value;
    setSpareSelected(selectedSpare);
    setSizeSelected(null);
    setRatingSelected(null);
    setScheduleSelected(null); // Reset Schedule when Spare is changed
  };

  const handleSize = (event) => {
    const selectedSize = event.target.value;
    setSizeSelected(selectedSize);
    setRatingSelected(null); // Reset Rating when Size is changed
    setScheduleSelected(null); // Reset Schedule when Size is changed
  };

  const handleRating = (event) => {
    setRatingSelected(event.target.value);
  };

  const handleSchedule = (event) => {
    setScheduleSelected(event.target.value);
  };

  const handleAddItem = (item) => {
    if (!assetTag) {
      alert("Please enter an Asset Tag first.");
      return;
    }

    const finalQuantity = quantity ? quantity : 0; // Default to 0 if no quantity is entered
    const finalPosition = position ? position : 0; // Default to 0 if no position is entered

    // Add the item to the list, associating it with the asset tag
    setAddedItems((prevItems) => [
      ...prevItems,
      { assetTag, ...item, quantity: finalQuantity, position: finalPosition },
    ]);

    // Reset values after adding the item
    resetForm();
  };

  // Function to reset all form fields
  const resetForm = () => {
    setSpareSelected(null);
    setSizeSelected(null);
    setRatingSelected(null);
    setScheduleSelected(null);
    setQuantity("");
    setPosition("");
    setAssetTag(""); // Reset the Asset Tag field
  };

  const handleDeleteItem = (index) => {
    // Remove the item at the given index
    setAddedItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  const handleExportExcel = () => {
    // Define the column order based on the table headers
    const columnOrder = [
      'Number',
      'Asset Tag',
      'Position',
      'Quantity',
      'Spare',
      'Short Description',
      'Full Description',
      'Material',
      'AMOC Code',
      'AMOC Code (old)'
    ];

    // Map the addedItems to ensure the correct order
    const mappedItems = addedItems.map((item, index) => ({
      'Number': index + 1, // Auto-generate the number
      'Asset Tag': item.assetTag,
      'Position': item.position,
      'Quantity': item.quantity,
      'Spare': item.SPARE,
      'Short Description': item['SHORT DESC.'],
      'Full Description': item['LONG DESC.'],
      'Material' : item.MATERIAL,
      'AMOC Code' : item["AMOC CODE"],
      'AMOC Code (old)' : item["AMOC CODE (OLD)"]
    }));

    // Convert the mapped items to a sheet
    const ws = XLSX.utils.json_to_sheet(mappedItems, { header: columnOrder });

    // Create a new workbook and append the sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Added Items");

    // Export the workbook to an Excel file
    XLSX.writeFile(wb, "added_items.xlsx");
  };

  const handleAddToExistingFile = () => {
    if (!existingFile) {
      alert("Please upload an existing Excel file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // Read the existing Excel file
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary" });

      // Get the existing sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert the existing sheet to JSON
      const existingData = XLSX.utils.sheet_to_json(sheet);

      // Append the new items to the existing data
      const updatedData = [...existingData, ...addedItems];

      // Convert the updated data back to a sheet
      const updatedSheet = XLSX.utils.json_to_sheet(updatedData);

      // Create a new workbook with the updated sheet
      const updatedWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(updatedWorkbook, updatedSheet, "Added Items");

      // Export the updated workbook back to the user's device
      XLSX.writeFile(updatedWorkbook, "updated_added_items.xlsx");
    };

    // Read the uploaded file as binary
    reader.readAsBinaryString(existingFile);
  };

  const availableSizes = spareSelected
    ? [...new Set(API[spareSelected].map((item) => item.SIZE))]
    : [];

  const availableRatings =
    spareSelected && sizeSelected
      ? [
          ...new Set(
            API[spareSelected]
              .filter((item) => item.SIZE === sizeSelected && item.RATING)
              .map((item) => item.RATING)
          ),
        ]
      : [];

  const availableSchedules =
    spareSelected && sizeSelected
      ? [
          ...new Set(
            API[spareSelected]
              .filter(
                (item) =>
                  item.SIZE === sizeSelected &&
                  (!ratingSelected || item.RATING === ratingSelected)
              )
              .map((item) => item["SCHEDULE "])
          ),
        ]
      : [];

  const filteredItems =
    spareSelected && sizeSelected
      ? API[spareSelected].filter(
          (item) =>
            item.SIZE === sizeSelected &&
            (!ratingSelected || item.RATING === ratingSelected) &&
            (!scheduleSelected || item["SCHEDULE "] === scheduleSelected)
        )
      : [];

  // Auto-select Rating if there's only one available or none
  useEffect(() => {
    if (availableRatings.length === 1 && !ratingSelected) {
      setRatingSelected(availableRatings[0]);
    } else if (availableRatings.length === 0) {
      setRatingSelected(null); // Reset rating if none is available
    }
  }, [availableRatings, ratingSelected]);

  // Enable Schedule if Rating is selected or not needed
  useEffect(() => {
    if (ratingSelected || availableRatings.length === 0) {
      // Enable Schedule selection if there's a rating or no rating options available
      if (availableSchedules.length > 0) {
        setScheduleSelected(availableSchedules[0]); // Auto-select the first available schedule
      }
    }
  }, [ratingSelected, availableSchedules]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-wxl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Static Pipeline</h1>

        {/* Asset Tag Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Asset Tag</label>
          <input
            type="text"
            value={assetTag}
            onChange={(e) => setAssetTag(e.target.value)}
            placeholder="Enter Asset Tag"
            className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Spare Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Select Spare</label>
          <select
            value={spareSelected}
            onChange={handleSpare}
            className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">--Select Spare--</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Size Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Select Size</label>
          <select
            value={sizeSelected}
            onChange={handleSize}
            className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={!spareSelected}
          >
            <option value="">--Select Size--</option>
            {availableSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Rating Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Select Rating</label>
          <select
            value={ratingSelected}
            onChange={handleRating}
            className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={!sizeSelected || availableRatings.length <= 1}
          >
            <option value="">--Select Rating--</option>
            {availableRatings.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Select Schedule</label>
          <select
            value={scheduleSelected}
            onChange={handleSchedule}
            className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={!sizeSelected || !availableSchedules.length}
          >
            <option value="">--Select Schedule--</option>
            {availableSchedules.map((schedule) => (
              <option key={schedule} value={schedule}>
                {schedule}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity and Position Input */}
        <div className="mb-4 flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter Quantity"
              className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Enter Position"
              className="mt-1 block w-full border-gray-300 py-1 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={() => handleAddItem(filteredItems[0] || {})}
          className="bg-indigo-600 text-white py-2 px-4 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          Add Item
        </button>

        {/* Added Items Table */}
        {addedItems.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Added Items</h2>
            <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
              <thead>
                <tr>
                  <th className="py-2 px-4 text-left">Number</th>
                  <th className="py-2 px-4 text-left">Asset Tag</th>
                  <th className="py-2 px-4 text-left">Spare</th>
                  <th className="py-2 px-4 text-left">Quantity</th>
                  <th className="py-2 px-4 text-left">Position</th>
                  <th className="py-2 px-4 text-left">Size</th>
                  <th className="py-2 px-4 text-left">Material</th>
                  <th className="py-2 px-4 text-left">Schedule</th>
                  <th className="py-2 px-4 text-left">End</th>
                  <th className="py-2 px-4 text-left">Short Description</th>
                  <th className="py-2 px-4 text-left">Full Description</th>
                  <th className="py-2 px-4 text-left">AMOC Code</th>
                  <th className="py-2 px-4 text-left">AMOC Code (old)</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {addedItems.map((item, index) => (
                  <tr key={index}>
                    <td className="py-2 px-4">{index + 1}</td>
                    <td className="py-2 px-4">{item.assetTag}</td>
                    <td className="py-2 px-4">{item.SPARE}</td>
                    <td className="py-2 px-4">{item.quantity}</td>
                    <td className="py-2 px-4">{item.position}</td>
                    <td className="py-2 px-4">{item.SIZE}</td>
                    <td className="py-2 px-4">{item.MATERIAL}</td>
                    <td className="py-2 px-4">{item["SCHEDULE "]}</td>
                    <td className="py-2 px-4">{item.ENDS}</td>
                    <td className="py-2 px-4">{item["SHORT DESC."]}</td>
                    <td className="py-2 px-4">{item["LONG DESC."]}</td>
                    <td className="py-2 px-4">{item["AMOC Code"]}</td>
                    <td className="py-2 px-4">{item["AMOC CODE (OLD)"]}</td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => handleDeleteItem(index)}
                        className="text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Export Buttons */}
            <div className="mt-4 flex space-x-4">
              <button
                onClick={handleExportExcel}
                className="bg-green-600 text-white py-2 px-4 rounded-md"
              >
                Export New
              </button>

              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setExistingFile(e.target.files[0])}
                className="mt-1 block"
              />
              <button
                onClick={handleAddToExistingFile}
                className="bg-blue-600 text-white py-2 px-4 rounded-md"
              >
                Add to Existing Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
