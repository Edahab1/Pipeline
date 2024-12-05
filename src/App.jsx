import React, { useState, useEffect, useRef } from "react";
import API from "../../../pipeline.json"; // Assuming your data is stored in pipeline.json
import * as XLSX from "xlsx"; // Import the xlsx library

export default function App() {
  const [spareSelected, setSpareSelected] = useState(null);
  const [sizeSelected, setSizeSelected] = useState(null);
  const [ratingSelected, setRatingSelected] = useState(null);
  const [scheduleSelected, setScheduleSelected] = useState(null);
  const [addedItems, setAddedItems] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [position, setPosition] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [existingFile, setExistingFile] = useState(null);

  const fileInputRef = useRef(null);

  const types = Object.keys(API);

  useEffect(() => {
    const storedItems = JSON.parse(localStorage.getItem("addedItems")) || [];
    setAddedItems(storedItems);
  }, []);

  useEffect(() => {
    if (addedItems.length > 0) {
      localStorage.setItem("addedItems", JSON.stringify(addedItems));
    }
  }, [addedItems]);

  const handleSpare = (event) => {
    setSpareSelected(event.target.value);
    setSizeSelected(null);
    setRatingSelected(null);
    setScheduleSelected(null);
  };

  const handleSize = (event) => {
    setSizeSelected(event.target.value);
    setRatingSelected(null);
    setScheduleSelected(null);
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
    const finalQuantity = quantity ? quantity : null;
    const finalPosition = position ? position : null;

    setAddedItems((prevItems) => [
      ...prevItems,
      { assetTag, ...item, quantity: finalQuantity, position: finalPosition },
    ]);
    resetForm();
  };

  const resetForm = () => {
    setSpareSelected(null);
    setSizeSelected(null);
    setRatingSelected(null);
    setScheduleSelected(null);
    setQuantity("");
    setPosition("");
    setAssetTag("");
  };

  const handleReset = () => {
    setAddedItems([]);
    setAssetTag("");
    localStorage.removeItem("addedItems");
  };

  const handleDeleteItem = (index) => {
    const updatedItems = addedItems.filter((_, i) => i !== index);
    setAddedItems(updatedItems);
    localStorage.setItem("addedItems", JSON.stringify(updatedItems));
  };

  const handleExportExcel = () => {
    const columnOrder = [
      "Number",
      "Asset Tag",
      "Position",
      "Quantity",
      "Spare",
      "Short Description",
      "Full Description",
      "Material",
      "AMOC Code",
      "AMOC Code (old)",
    ];

    const mappedItems = addedItems.map((item, index) => ({
      Number: index + 1,
      "Asset Tag": item.assetTag,
      Position: item.position,
      Quantity: item.quantity,
      Spare: item.SPARE,
      "Short Description": item["SHORT DESC."],
      "Full Description": item["LONG DESC."],
      Material: item.MATERIAL,
      "AMOC Code": item["AMOC CODE"],
      "AMOC Code (old)": item["AMOC CODE (OLD)"],
    }));

    const ws = XLSX.utils.json_to_sheet(mappedItems, { header: columnOrder });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Added Items");
    XLSX.writeFile(wb, "added_items.xlsx");
  };

  const handleAddToExistingFile = () => {
    if (!existingFile) {
      alert("Please upload an existing Excel file first.");
      return;
    }
  
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
  
      const existingData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  
      const nonDuplicateItems = [];
      const duplicateItems = [];
  
      // Check for duplicates
      addedItems.forEach((item) => {
        const isDuplicate = existingData.some((row) =>
          Object.keys(item).every((key) => row[key] === item[key])
        );
  
        if (isDuplicate) {
          duplicateItems.push(item);
        } else {
          nonDuplicateItems.push(item);
        }
      });
  
      if (duplicateItems.length > 0) {
        alert(`${duplicateItems.length} duplicate row(s) found and excluded.`);
      }
  
      // Add only non-duplicate items
      const updatedData = [
        ...existingData,
        ...nonDuplicateItems.map((item, index) => ({
          Number: existingData.length + index + 1,
          "Asset Tag": item.assetTag,
          Position: item.position,
          Quantity: item.quantity,
          Spare: item.SPARE,
          "Short Description": item["SHORT DESC."],
          "Full Description": item["LONG DESC."],
          Material: item.MATERIAL,
          "AMOC Code": item["AMOC CODE"],
          "AMOC Code (old)": item["AMOC CODE (OLD)"],
        })),
      ];
  
      // Calculate column widths based on content
      const columnOrder = [
        "#",
        "Asset Tag",
        "Position",
        "Quantity",
        "Spare",
        "Short Description",
        "Full Description",
        "Material",
        "AMOC Code",
        "AMOC Code (old)",
      ];
  
      const colWidths = columnOrder.map((col) => {
        const maxWidth = Math.max(
          col.length, // Header width
          ...updatedData.map((item) => (item[col] ? item[col].toString().length : 0)) // Content width
        );
        return { wch: maxWidth + 2 }; // Add extra padding
      });
  
      // Create the updated sheet with adjusted column widths
      const updatedSheet = XLSX.utils.json_to_sheet(updatedData);
      updatedSheet["!cols"] = colWidths;
  
      // Apply header style (optional, for aesthetics)
      const headerRange = XLSX.utils.decode_range(updatedSheet["!ref"]);
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!updatedSheet[cellAddress]) continue;
  
        updatedSheet[cellAddress].s = {
          fill: { fgColor: { rgb: "FFFF00" } }, // Yellow background
          font: { bold: true }, // Bold font
        };
      }
  
      // Update the sheet and save the file
      workbook.Sheets[sheetName] = updatedSheet;
      XLSX.writeFile(workbook, "updated_added_items.xlsx");
  
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
  
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-wxl mx-auto bg-white p-8 rounded-md shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Asset Management</h1>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Asset Tag</label>
          <input
            type="text"
            value={assetTag}
            onChange={(e) => setAssetTag(e.target.value)}
            className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter Asset Tag"
          />
        </div>

        {/* Spare Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Select Spare</label>
          <select
            value={spareSelected || ""}
            onChange={handleSpare}
            className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select Spare</option>
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
            value={sizeSelected || ""}
            onChange={handleSize}
            className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={!spareSelected}
          >
            <option value="">Select Size</option>
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
            value={ratingSelected || ""}
            onChange={handleRating}
            className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={!sizeSelected}
          >
            <option value="">Select Rating</option>
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
            value={scheduleSelected || ""}
            onChange={handleSchedule}
            className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={!ratingSelected}
          >
            <option value="">Select Schedule</option>
            {availableSchedules.map((schedule) => (
              <option key={schedule} value={schedule}>
                {schedule}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity and Position */}
        <div className="flex mb-4 gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="mt-1 block w-full border-gray-300 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={() => handleAddItem(filteredItems[0] || {})}
          className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600"
        >
          Add Item
        </button>

        

        {/* Displaying the Added Items */}
        <div className="mt-6 overflow-x-auto md:overflow-hidden">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Added Items
            {/* Reset Button */}
        <button
          onClick={handleReset}
          className="bg-red-500 text-white py-1 px-2 text-sm rounded-md hover:bg-red-600 ml-4"
        >
          Reset Table
        </button>
          </h2>
          <table className="min-w-full table-auto">
            <thead>
              <tr className="border-b-2">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Asset Tag</th>
                <th className="px-4 py-2">Position</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Spare</th>
                <th className="px-4 py-2">Short Description</th>
                <th className="px-4 py-2">Full Description</th>
                <th className="px-4 py-2">Material</th>
                <th className="px-4 py-2">AMOC Code</th>
                <th className="px-4 py-2">AMOC Code (Old)</th>
                {/* <th className="px-4 py-2">Action</th> */}
              </tr>
            </thead>
            <tbody>
              {addedItems.map((item, index) => (
                <tr key={index} className="border-b-2">
                  <td className="px-4 py-2">{index + 1}</td>
                  <td className="px-4 py-2">{item.assetTag}</td>
                  <td className="px-4 py-2">{item.position}</td>
                  <td className="px-4 py-2">{item.quantity}</td>
                  <td className="px-4 py-2">{item.SPARE}</td>
                  <td className="px-4 py-2">{item["SHORT DESC."]}</td>
                  <td className="px-4 py-2">{item["LONG DESC."]}</td>
                  <td className="px-4 py-2">{item.MATERIAL}</td>
                  <td className="px-4 py-2">{item["AMOC CODE"]}</td>
                  <td className="px-4 py-2">{item["AMOC CODE (OLD)"]}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {addedItems.length > 0 && (
            <div className="mt-4">
            <button
              onClick={handleExportExcel}
              className="bg-green-600 text-white py-2 px-4 w-[180px] rounded-md"
            >
              Export New
            </button>

            <div className="flex mt-3">
            <button
              onClick={handleAddToExistingFile}
              className="bg-blue-600 text-white py-2 px-4 me-2  w-[180px] rounded-md"
            >
              Add to Existing Excel
            </button>
            <input
            ref={fileInputRef} // Attach the ref
              type="file"
              accept=".xlsx"
              onChange={(e) => setExistingFile(e.target.files[0])}
              className="mt-1 block"
            />
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}