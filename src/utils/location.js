function formatCoordinates(latitude, longitude) {
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

export function formatLocationLabel(location) {
  if (!location?.latitude || !location?.longitude) {
    return "Localizacao ainda nao validada";
  }

  return `Lat ${location.latitude.toFixed(4)} | Lon ${location.longitude.toFixed(4)}`;
}

export function buildLocationProofLabel(location) {
  if (!location?.latitude || !location?.longitude) {
    return "Sem localizacao validada";
  }

  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

export async function captureCurrentLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocalizacao indisponivel neste dispositivo.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = formatCoordinates(position.coords.latitude, position.coords.longitude);
        resolve({
          ...coords,
          accuracy: Math.round(position.coords.accuracy || 0),
          capturedAt: new Date().toISOString(),
        });
      },
      (error) => {
        if (error?.code === 1) {
          reject(new Error("Permissao de localizacao negada."));
          return;
        }
        if (error?.code === 2) {
          reject(new Error("Nao foi possivel determinar sua localizacao."));
          return;
        }
        reject(new Error("Falha ao validar localizacao atual."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
