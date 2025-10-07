import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const ProgramRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form data state
  const [formData, setFormData] = useState({
    // Data Diri
    full_name: user?.full_name || "",
    nik: "",
    gender: "",
    birth_place: "",
    birth_date: "",
    email: user?.email || "",
    phone: user?.phone || "",
    last_education: "",
    parent_phone: "",

    // Alamat KTP
    ktp_province: "",
    ktp_province_name: "",
    ktp_city: "",
    ktp_city_name: "",
    ktp_address: "",

    // Alamat Domisili
    domicile_province: "",
    domicile_province_name: "",
    domicile_city: "",
    domicile_city_name: "",
    domicile_address: "",

    // Foto
    photo_file: null,
    photo_preview: null,
    photo_path: "",

    // Program
    program_id: "",
  });

  useEffect(() => {
    fetchPrograms();
    fetchProvinces();
  }, []);

  // Clean up photo preview URL
  useEffect(() => {
    return () => {
      if (formData.photo_preview) {
        URL.revokeObjectURL(formData.photo_preview);
      }
    };
  }, [formData.photo_preview]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/programs");
      if (response.data.success) {
        setPrograms(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
      setError("Gagal memuat data program");
    } finally {
      setLoading(false);
    }
  };

  // Fetch provinces melalui proxy backend
  const fetchProvinces = async () => {
    try {
      setLoadingProvinces(true);
      const response = await axios.get("/api/wilayah/provinces");

      if (response.data.success) {
        setProvinces(response.data.data);
      } else {
        setError("Gagal memuat data provinsi");
      }
    } catch (error) {
      console.error("Error fetching provinces:", error);
      setError("Gagal memuat data provinsi");
    } finally {
      setLoadingProvinces(false);
    }
  };

  // Fetch cities melalui proxy backend
  const fetchCities = async (provinceCode, type) => {
    try {
      setLoadingCities((prev) => ({ ...prev, [provinceCode]: true }));

      const response = await axios.get(
        `/api/wilayah/regencies/${provinceCode}`
      );

      if (response.data.success) {
        setCities((prev) => ({
          ...prev,
          [provinceCode]: response.data.data,
        }));
      }
    } catch (error) {
      console.error(
        `Error fetching cities for province ${provinceCode}:`,
        error
      );
      setError(
        `Gagal memuat data kabupaten/kota untuk provinsi ${provinceCode}`
      );
    } finally {
      setLoadingCities((prev) => ({ ...prev, [provinceCode]: false }));
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (file) => {
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("photo", file);

      const response = await axios.post(
        "/api/documents/upload-photo",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        return response.data.data.file_path;
      } else {
        throw new Error("Upload foto gagal");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw new Error(error.response?.data?.message || "Gagal mengupload foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle file input change
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Hanya file gambar yang diizinkan");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB");
      return;
    }

    try {
      setError("");
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        photo_file: file,
        photo_preview: previewUrl,
      }));

      // Auto-upload photo
      const photoPath = await handlePhotoUpload(file);
      setFormData((prev) => ({
        ...prev,
        photo_path: photoPath,
      }));
    } catch (error) {
      setError(error.message);
      // Reset photo if upload fails
      setFormData((prev) => ({
        ...prev,
        photo_file: null,
        photo_preview: null,
        photo_path: "",
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "ktp_province") {
      const selectedProvince = provinces.find((p) => p.code === value);
      setFormData((prev) => ({
        ...prev,
        ktp_province: value,
        ktp_province_name: selectedProvince ? selectedProvince.name : "",
        ktp_city: "",
        ktp_city_name: "",
      }));

      // Fetch cities for selected province
      if (value && !cities[value]) {
        fetchCities(value, "ktp");
      }
    } else if (name === "ktp_city") {
      const selectedCity = cities[formData.ktp_province]?.find(
        (c) => c.code === value
      );
      setFormData((prev) => ({
        ...prev,
        ktp_city: value,
        ktp_city_name: selectedCity ? selectedCity.name : "",
      }));
    } else if (name === "domicile_province") {
      const selectedProvince = provinces.find((p) => p.code === value);
      setFormData((prev) => ({
        ...prev,
        domicile_province: value,
        domicile_province_name: selectedProvince ? selectedProvince.name : "",
        domicile_city: "",
        domicile_city_name: "",
      }));

      // Fetch cities for selected province
      if (value && !cities[value]) {
        fetchCities(value, "domicile");
      }
    } else if (name === "domicile_city") {
      const selectedCity = cities[formData.domicile_province]?.find(
        (c) => c.code === value
      );
      setFormData((prev) => ({
        ...prev,
        domicile_city: value,
        domicile_city_name: selectedCity ? selectedCity.name : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      setError("");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
    setError("");
  };

  const validateStep = (step) => {
    const errors = [];

    if (step === 1) {
      if (!formData.full_name) errors.push("Nama lengkap harus diisi");
      if (!formData.nik) errors.push("NIK harus diisi");
      if (!formData.gender) errors.push("Jenis kelamin harus dipilih");
      if (!formData.birth_place) errors.push("Tempat lahir harus diisi");
      if (!formData.birth_date) errors.push("Tanggal lahir harus diisi");
      if (!formData.phone) errors.push("Nomor handphone harus diisi");
      if (!formData.last_education)
        errors.push("Pendidikan terakhir harus diisi");
      if (!formData.parent_phone)
        errors.push("Nomor handphone orang tua harus diisi");
      if (!formData.ktp_province) errors.push("Provinsi KTP harus dipilih");
      if (!formData.ktp_city) errors.push("Kota/Kabupaten KTP harus dipilih");
      if (!formData.ktp_address) errors.push("Alamat KTP harus diisi");
      if (!formData.domicile_province)
        errors.push("Provinsi domisili harus dipilih");
      if (!formData.domicile_city)
        errors.push("Kota/Kabupaten domisili harus dipilih");
      if (!formData.domicile_address)
        errors.push("Alamat domisili harus diisi");
      if (!formData.photo_path) errors.push("Foto harus diupload");
    }

    if (step === 2) {
      if (!formData.program_id) errors.push("Program harus dipilih");
    }

    if (errors.length > 0) {
      setError(errors.join(", "));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    try {
      setSubmitLoading(true);
      setError("");

      // Prepare data for backend
      const registrationData = {
        user_id: user.id,
        program_id: formData.program_id,
        // Data tambahan
        nik: formData.nik,
        gender: formData.gender,
        birth_place: formData.birth_place,
        birth_date: formData.birth_date,
        last_education: formData.last_education,
        parent_phone: formData.parent_phone,
        ktp_province_code: formData.ktp_province,
        ktp_province_name: formData.ktp_province_name,
        ktp_city_code: formData.ktp_city,
        ktp_city_name: formData.ktp_city_name,
        ktp_address: formData.ktp_address,
        domicile_province_code: formData.domicile_province,
        domicile_province_name: formData.domicile_province_name,
        domicile_city_code: formData.domicile_city,
        domicile_city_name: formData.domicile_city_name,
        domicile_address: formData.domicile_address,
        photo_path: formData.photo_path,
        // Data user untuk update
        user_data: {
          full_name: formData.full_name,
          phone: formData.phone,
        },
      };

      const response = await axios.post("/api/registrations", registrationData);

      if (response.data.success) {
        setSuccess("Pendaftaran berhasil! Silakan tunggu proses seleksi.");
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } else {
        setError(response.data.message || "Gagal melakukan pendaftaran");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError(
        error.response?.data?.message ||
          "Terjadi kesalahan saat mendaftar. Silakan coba lagi."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const getCurrentCities = (provinceCode) => {
    return cities[provinceCode] || [];
  };

  const isCitiesLoading = (provinceCode) => {
    return loadingCities[provinceCode] || false;
  };

  // Step 1: Data Diri
  const renderStep1 = () => (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Data Diri</h4>
      </div>

      {/* Upload Foto */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Upload Foto</h5>
            <div className="row">
              <div className="col-md-6">
                <label htmlFor="photo" className="form-label">
                  Foto <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  className="form-control"
                  id="photo"
                  name="photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploadingPhoto}
                  required
                />
                <div className="form-text">Format: JPG, PNG (Maksimal 5MB)</div>
                {uploadingPhoto && (
                  <div className="mt-2">
                    <div
                      className="spinner-border spinner-border-sm"
                      role="status"
                    >
                      <span className="visually-hidden">Mengupload...</span>
                    </div>
                    <small className="text-muted ms-2">
                      Mengupload foto...
                    </small>
                  </div>
                )}
              </div>
              <div className="col-md-6">
                {formData.photo_preview && (
                  <div className="text-center">
                    <p className="mb-2">
                      <strong>Preview Foto:</strong>
                    </p>
                    <img
                      src={formData.photo_preview}
                      alt="Preview"
                      className="img-thumbnail"
                      style={{
                        maxWidth: "200px",
                        maxHeight: "200px",
                        objectFit: "cover",
                      }}
                    />
                    {formData.photo_path && (
                      <div className="mt-2">
                        <span className="badge bg-success">
                          ✓ Foto berhasil diupload
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Pribadi */}
      <div className="col-12">
        <h5 className="mb-3">Data Pribadi</h5>
      </div>

      {/* Baris 1 */}
      <div className="col-md-6 mb-3">
        <label htmlFor="full_name" className="form-label">
          Nama Lengkap <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="col-md-6 mb-3">
        <label htmlFor="nik" className="form-label">
          NIK <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          id="nik"
          name="nik"
          value={formData.nik}
          onChange={handleInputChange}
          required
        />
      </div>

      {/* Baris 2 */}
      <div className="col-md-6 mb-3">
        <label htmlFor="gender" className="form-label">
          Jenis Kelamin <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          required
        >
          <option value="">Pilih Jenis Kelamin</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>

      <div className="col-md-6 mb-3">
        <label htmlFor="birth_place" className="form-label">
          Tempat Lahir <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          id="birth_place"
          name="birth_place"
          value={formData.birth_place}
          onChange={handleInputChange}
          required
        />
      </div>

      {/* Baris 3 */}
      <div className="col-md-6 mb-3">
        <label htmlFor="birth_date" className="form-label">
          Tanggal Lahir <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          className="form-control"
          id="birth_date"
          name="birth_date"
          value={formData.birth_date}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="col-md-6 mb-3">
        <label htmlFor="email" className="form-label">
          Email <span className="text-danger">*</span>
        </label>
        <input
          type="email"
          className="form-control"
          id="email"
          name="email"
          value={formData.email}
          readOnly
          disabled
        />
        <small className="text-muted">
          Email sesuai dengan akun registrasi
        </small>
      </div>

      {/* Baris 4 */}
      <div className="col-md-6 mb-3">
        <label htmlFor="phone" className="form-label">
          Nomor Handphone <span className="text-danger">*</span>
        </label>
        <input
          type="tel"
          className="form-control"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="col-md-6 mb-3">
        <label htmlFor="last_education" className="form-label">
          Pendidikan Terakhir <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          id="last_education"
          name="last_education"
          value={formData.last_education}
          onChange={handleInputChange}
          required
        >
          <option value="">Pilih Pendidikan</option>
          <option value="SMA">SMA/Sederajat</option>
          <option value="D1">D1</option>
          <option value="D2">D2</option>
          <option value="D3">D3</option>
          <option value="D4">D4</option>
          <option value="S1">S1</option>
          <option value="S2">S2</option>
          <option value="S3">S3</option>
        </select>
      </div>

      {/* Baris 5 */}
      <div className="col-md-6 mb-3">
        <label htmlFor="parent_phone" className="form-label">
          Nomor Handphone Orang Tua <span className="text-danger">*</span>
        </label>
        <input
          type="tel"
          className="form-control"
          id="parent_phone"
          name="parent_phone"
          value={formData.parent_phone}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="col-12 mt-4">
        <h5>Alamat Sesuai KTP</h5>
      </div>

      {/* Baris 6 - Alamat KTP */}
      <div className="col-md-6 mb-3">
        <label htmlFor="ktp_province" className="form-label">
          Provinsi <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          id="ktp_province"
          name="ktp_province"
          value={formData.ktp_province}
          onChange={handleInputChange}
          required
        >
          <option value="">Pilih Provinsi</option>
          {loadingProvinces ? (
            <option value="" disabled>
              Memuat data provinsi...
            </option>
          ) : (
            provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))
          )}
        </select>
        {loadingProvinces && (
          <small className="text-muted">Memuat data provinsi...</small>
        )}
      </div>

      <div className="col-md-6 mb-3">
        <label htmlFor="ktp_city" className="form-label">
          Kabupaten/Kota <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          id="ktp_city"
          name="ktp_city"
          value={formData.ktp_city}
          onChange={handleInputChange}
          disabled={
            !formData.ktp_province || isCitiesLoading(formData.ktp_province)
          }
          required
        >
          <option value="">Pilih Kabupaten/Kota</option>
          {formData.ktp_province && isCitiesLoading(formData.ktp_province) ? (
            <option value="" disabled>
              Memuat data kabupaten/kota...
            </option>
          ) : (
            formData.ktp_province &&
            getCurrentCities(formData.ktp_province).map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))
          )}
        </select>
        {formData.ktp_province && isCitiesLoading(formData.ktp_province) && (
          <small className="text-muted">Memuat data kabupaten/kota...</small>
        )}
      </div>

      <div className="col-12 mb-3">
        <label htmlFor="ktp_address" className="form-label">
          Detail Alamat <span className="text-danger">*</span>
        </label>
        <textarea
          className="form-control"
          id="ktp_address"
          name="ktp_address"
          rows="3"
          value={formData.ktp_address}
          onChange={handleInputChange}
          placeholder="Masukkan alamat lengkap sesuai KTP"
          required
        ></textarea>
      </div>

      <div className="col-12 mt-4">
        <h5>Alamat Domisili</h5>
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="same_as_ktp"
            onChange={(e) => {
              if (e.target.checked) {
                setFormData((prev) => ({
                  ...prev,
                  domicile_province: prev.ktp_province,
                  domicile_province_name: prev.ktp_province_name,
                  domicile_city: prev.ktp_city,
                  domicile_city_name: prev.ktp_city_name,
                  domicile_address: prev.ktp_address,
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  domicile_province: "",
                  domicile_province_name: "",
                  domicile_city: "",
                  domicile_city_name: "",
                  domicile_address: "",
                }));
              }
            }}
          />
          <label className="form-check-label" htmlFor="same_as_ktp">
            Sama dengan alamat KTP
          </label>
        </div>
      </div>

      {/* Baris 7 - Alamat Domisili */}
      <div className="col-md-6 mb-3">
        <label htmlFor="domicile_province" className="form-label">
          Provinsi <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          id="domicile_province"
          name="domicile_province"
          value={formData.domicile_province}
          onChange={handleInputChange}
          required
        >
          <option value="">Pilih Provinsi</option>
          {loadingProvinces ? (
            <option value="" disabled>
              Memuat data provinsi...
            </option>
          ) : (
            provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="col-md-6 mb-3">
        <label htmlFor="domicile_city" className="form-label">
          Kabupaten/Kota <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          id="domicile_city"
          name="domicile_city"
          value={formData.domicile_city}
          onChange={handleInputChange}
          disabled={
            !formData.domicile_province ||
            isCitiesLoading(formData.domicile_province)
          }
          required
        >
          <option value="">Pilih Kabupaten/Kota</option>
          {formData.domicile_province &&
          isCitiesLoading(formData.domicile_province) ? (
            <option value="" disabled>
              Memuat data kabupaten/kota...
            </option>
          ) : (
            formData.domicile_province &&
            getCurrentCities(formData.domicile_province).map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))
          )}
        </select>
        {formData.domicile_province &&
          isCitiesLoading(formData.domicile_province) && (
            <small className="text-muted">Memuat data kabupaten/kota...</small>
          )}
      </div>

      <div className="col-12 mb-3">
        <label htmlFor="domicile_address" className="form-label">
          Detail Alamat <span className="text-danger">*</span>
        </label>
        <textarea
          className="form-control"
          id="domicile_address"
          name="domicile_address"
          rows="3"
          value={formData.domicile_address}
          onChange={handleInputChange}
          placeholder="Masukkan alamat lengkap domisili saat ini"
          required
        ></textarea>
      </div>
    </div>
  );

  // Step 2: Pemilihan Program
  const renderStep2 = () => (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Pemilihan Program</h4>

        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Memuat data program...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="alert alert-warning">
            <p>Tidak ada program yang tersedia saat ini.</p>
          </div>
        ) : (
          <div className="row">
            {programs.map((program) => (
              <div key={program.id} className="col-md-6 mb-4">
                <div
                  className={`card h-100 ${
                    formData.program_id === program.id ? "border-primary" : ""
                  }`}
                >
                  <div className="card-body">
                    <h5 className="card-title">{program.name}</h5>
                    <p className="card-text text-muted small">
                      {program.description?.substring(0, 150)}...
                    </p>
                    <div className="mb-2">
                      <strong>Durasi:</strong> {program.duration}
                    </div>
                    <div className="mb-2">
                      <strong>Biaya:</strong> Rp{" "}
                      {program.cost?.toLocaleString("id-ID")}
                    </div>
                    <div className="mb-3">
                      <strong>Jadwal:</strong> {program.schedule}
                    </div>
                    <button
                      type="button"
                      className={`btn ${
                        formData.program_id === program.id
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          program_id: program.id,
                        }))
                      }
                    >
                      {formData.program_id === program.id
                        ? "✓ Terpilih"
                        : "Pilih Program"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {formData.program_id && (
          <div className="alert alert-info mt-3">
            <strong>Program Terpilih:</strong>{" "}
            {programs.find((p) => p.id == formData.program_id)?.name}
          </div>
        )}
      </div>
    </div>
  );

  // Step 3: Konfirmasi
  const renderStep3 = () => (
    <div className="row">
      <div className="col-12">
        <h4 className="mb-4">Konfirmasi Pendaftaran</h4>

        <div className="card">
          <div className="card-header">
            <h5>Foto</h5>
          </div>
          <div className="card-body">
            {formData.photo_preview ? (
              <div className="text-center">
                <img
                  src={formData.photo_preview}
                  alt="Foto Peserta"
                  className="img-thumbnail"
                  style={{
                    maxWidth: "200px",
                    maxHeight: "200px",
                    objectFit: "cover",
                  }}
                />
              </div>
            ) : (
              <p className="text-muted">Foto belum diupload</p>
            )}
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5>Data Diri</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p>
                  <strong>Nama Lengkap:</strong> {formData.full_name}
                </p>
                <p>
                  <strong>NIK:</strong> {formData.nik}
                </p>
                <p>
                  <strong>Jenis Kelamin:</strong>{" "}
                  {formData.gender === "L" ? "Laki-laki" : "Perempuan"}
                </p>
                <p>
                  <strong>Tempat, Tanggal Lahir:</strong> {formData.birth_place}
                  , {formData.birth_date}
                </p>
                <p>
                  <strong>Email:</strong> {formData.email}
                </p>
              </div>
              <div className="col-md-6">
                <p>
                  <strong>No. Handphone:</strong> {formData.phone}
                </p>
                <p>
                  <strong>Pendidikan Terakhir:</strong>{" "}
                  {formData.last_education}
                </p>
                <p>
                  <strong>No. HP Orang Tua:</strong> {formData.parent_phone}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5>Alamat KTP</h5>
          </div>
          <div className="card-body">
            <p>
              <strong>Provinsi:</strong> {formData.ktp_province_name}
            </p>
            <p>
              <strong>Kota/Kabupaten:</strong> {formData.ktp_city_name}
            </p>
            <p>
              <strong>Alamat:</strong> {formData.ktp_address}
            </p>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5>Alamat Domisili</h5>
          </div>
          <div className="card-body">
            <p>
              <strong>Provinsi:</strong> {formData.domicile_province_name}
            </p>
            <p>
              <strong>Kota/Kabupaten:</strong> {formData.domicile_city_name}
            </p>
            <p>
              <strong>Alamat:</strong> {formData.domicile_address}
            </p>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5>Program yang Dipilih</h5>
          </div>
          <div className="card-body">
            <p>
              <strong>Program:</strong>{" "}
              {programs.find((p) => p.id == formData.program_id)?.name}
            </p>
            <p>
              <strong>Durasi:</strong>{" "}
              {programs.find((p) => p.id == formData.program_id)?.duration}
            </p>
            <p>
              <strong>Biaya:</strong> Rp{" "}
              {programs
                .find((p) => p.id == formData.program_id)
                ?.cost?.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="alert alert-warning mt-4">
          <h6>Perhatian!</h6>
          <p className="mb-0">
            Pastikan semua data yang Anda isi sudah benar. Data yang sudah
            dikirim tidak dapat diubah. Setelah mengirim formulir, Anda akan
            masuk ke proses seleksi.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {/* Header */}
          <div className="text-center mb-5">
            <h2>Formulir Pendaftaran Program Magang</h2>
            <p className="text-muted">
              Isi data diri Anda dengan lengkap dan benar
            </p>
          </div>

          {/* Progress Steps */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="text-center flex-fill">
                    <div
                      className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                        step <= currentStep
                          ? "bg-primary text-white"
                          : "bg-light text-muted"
                      }`}
                      style={{ width: "40px", height: "40px" }}
                    >
                      {step}
                    </div>
                    <div className="mt-2 small">
                      {step === 1 && "Data Diri"}
                      {step === 2 && "Pemilihan Program"}
                      {step === 3 && "Konfirmasi"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="progress mt-2" style={{ height: "4px" }}>
                <div
                  className="progress-bar"
                  style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-body">
                {/* Step Content */}
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}

                {/* Navigation Buttons */}
                <div className="d-flex justify-content-between mt-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    ← Sebelumnya
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={nextStep}
                    >
                      Lanjutkan →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={submitLoading}
                    >
                      {submitLoading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                          ></span>
                          Mengirim...
                        </>
                      ) : (
                        "✓ Lanjutkan Pendaftaran"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProgramRegistration;
