import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useUser } from '../context/UserContext';
import apiService from '../services/api.service';

export default function LocationSharingTracker() {
  const { user, locationSharingEnabled, setLocationSharingEnabled } = useUser();

  useEffect(() => {
    if (!user?.id || !locationSharingEnabled) return undefined;

    let active = true;
    let starting = false;
    let clearingLocation: Promise<void> | null = null;
    let subscription: Location.LocationSubscription | null = null;

    const stopTracking = () => {
      subscription?.remove();
      subscription = null;
    };

    const startTracking = async () => {
      if (!active || starting || subscription || AppState.currentState !== 'active') return;
      starting = true;
      try {
        await clearingLocation;
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          const response = await apiService.updateLocationSharing(false);
          if (!response.success) {
            throw new Error(response.error || 'Impossible de révoquer le partage après le retrait de l’autorisation GPS.');
          }
          setLocationSharingEnabled(false);
          return;
        }

        const nextSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          (position) => {
            void apiService.updateCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }).then((response) => {
              if (!response.success) {
                console.error('Unable to update shared location:', response.error);
              }
            }).catch((error) => {
              console.error('Unable to update shared location:', error);
            });
          }
        );

        if (active && AppState.currentState === 'active') {
          subscription = nextSubscription;
        } else {
          nextSubscription.remove();
        }
      } catch (error) {
        console.error('Unable to start foreground location sharing:', error);
      } finally {
        starting = false;
      }
    };

    void startTracking();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void startTracking();
      } else {
        stopTracking();
        clearingLocation = apiService.clearCurrentLocation().then((response) => {
          if (!response.success) {
            console.error('Unable to clear background location:', response.error);
          }
        }).catch((error) => {
          console.error('Unable to clear background location:', error);
        });
      }
    });

    return () => {
      active = false;
      appStateSubscription.remove();
      stopTracking();
    };
  }, [locationSharingEnabled, setLocationSharingEnabled, user?.id]);

  return null;
}
