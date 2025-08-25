import React, { useState, useEffect } from 'react'
import { View, Text, Image, StyleSheet, Pressable, Vibration } from 'react-native'
import { Box, Det, Track } from './types.tsx'
import { convertBoxToPixels } from './tracker.tsx'

type ObjectBoxesProps = {
    tracks: Track[];
    setTracks: any;
    lockBox: any;
    setLockBox: any;
    sizeRef: any;
    sendCommand: any;
    sendToESP: any;
    isReceiver: boolean;
};


export default function ObjectBoxes({ tracks, setTracks, lockBox, setLockBox, sizeRef, sendCommand, sendToESP, isReceiver }: ObjectBoxesProps) {
    interface PIDControllerState {
        integral: number;
        lastError: number;
    }

    // Reusable PID calculation function
    function calculatePIDOutput(
        error: number,
        state: PIDControllerState,
        gains: { Kp: number; Ki: number; Kd: number },
        dt: number
    ): number {
        state.integral += error * dt;
        const derivative = (error - state.lastError) / dt;
        state.lastError = error;

        const output = (gains.Kp * error) + (gains.Ki * state.integral) + (gains.Kd * derivative);
        return output;
    }

    const pidStateYaw: PIDControllerState = { integral: 0, lastError: 0 };
    const yawGains = { Kp: 0.0000001, Ki: 0, Kd: 0.000000001 };
    let lastTimestamp = Date.now();

    // Main function to update the robot's movement based on object tracking.
    function updateRobotFromObjectLock(originalBox: Box, currentBox: Box) {
        // Calculate time delta (dt) for PID calculations
        const now = Date.now();
        const dt = (now - lastTimestamp) / 1000.0; // in seconds
        lastTimestamp = now;


        // Calculate the box centers and error
        const originalCenterX = (originalBox.xmin + originalBox.xmax) / 2;
        const currentCenterX = (currentBox.xmin + currentBox.xmax) / 2;
        let errorX = originalCenterX - currentCenterX;

        // Add a deadzone to add tolerance and not constantly move
        if (Math.abs(errorX) < 25) errorX = 0;

        // Get the PID output
        let yawOutput = calculatePIDOutput(errorX, pidStateYaw, yawGains, dt);


        // Translate PID outputs into motor and servo commands
        if (yawOutput < 0) {
            yawOutput = (yawOutput) - 80;
        } else if (yawOutput > 0) {
            yawOutput = (yawOutput) + 80;
        }
        let l = -yawOutput
        let r = yawOutput

        const PULSE_DURATION_MS = 50;
        const SMALL_ERROR_THRESHOLD = 200;

        if ((Math.abs(yawOutput) > 0) && (Math.abs(yawOutput) < SMALL_ERROR_THRESHOLD)) {
            // For small errors, send a short pulse of minimum power
            sendToESP('m', { 'l': l, 'r': r });

            setTimeout(() => {
                sendToESP('m', { 'l': 0, 'r': 0 });
                sendToESP('m', { 'l': 0, 'r': 0 });
            }, PULSE_DURATION_MS);

        } else if (Math.abs(yawOutput) >= SMALL_ERROR_THRESHOLD) {
            // large errors continuously move until the next frame is ready
            sendToESP('m', { 'l': l, 'r': r });
        }
    }


    function handleTrackLongPress(t: Track) {
        if (!t.locked) {
            Vibration.vibrate();
            setLockBox(convertBoxToPixels(t.box, sizeRef));
        } else {
            setLockBox(null);
            sendToESP('m', { 'l': 0, 'r': 0 });
        }

        if (isReceiver) {
            // Update tracks so that they all have locked=false, and flip the track that was pressed
            setTracks((prev: any) =>
                prev.map((tr: any) => ({
                    ...tr,
                    locked: tr.id === t.id ? !t.locked : false,
                }))
            );
        } else {
            sendCommand('toggleLockedTrack', t.id)
        }
    }

    // updates that need to be done every object detection frame
    useEffect(() => {
        let t = tracks.find(t => t.locked);
        if (t) {
            if (lockBox) {
                if (!isReceiver) {
                    // PID movement control
                    updateRobotFromObjectLock(lockBox, convertBoxToPixels(t.box, sizeRef));
                }
            } else {
                if (t) {
                    setLockBox({
                        'xmin': t.box.xmin * sizeRef.current.w,
                        'ymin': t.box.ymin * sizeRef.current.h,
                        'xmax': t.box.xmax * sizeRef.current.w,
                        'ymax': t.box.ymax * sizeRef.current.h,
                    });
                }
            }
        } else {
            if (lockBox) setLockBox(null);
        }
    }, [tracks])

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
            {tracks.map((t: any) => {
                const left = t.box.xmin * sizeRef.current.w;
                const top = t.box.ymin * sizeRef.current.h;
                const width = (t.box.xmax - t.box.xmin) * sizeRef.current.w;
                const height = (t.box.ymax - t.box.ymin) * sizeRef.current.h;

                let cornerLines = [];
                if (t.locked && lockBox) {
                    let segments = [
                        [[left, top], [lockBox.xmin, lockBox.ymin]],  // top-left
                        [[left + width, top], [lockBox.xmax, lockBox.ymin]],  // top-right
                        [[left, top + height], [lockBox.xmin, lockBox.ymax]],  // bot-left
                        [[left + width, top + height], [lockBox.xmax, lockBox.ymax]]  // bot-right
                    ]

                    for (const pair of segments) {
                        let [a, b] = pair
                        let [ax, ay] = a
                        let [bx, by] = b

                        const dx = bx - ax;
                        const dy = by - ay;
                        const L = Math.hypot(dx, dy);
                        const ang = Math.atan2(dy, dx);

                        const tpx = 2;
                        const midX = (ax + bx) / 2;
                        const midY = (ay + by) / 2;

                        const snappedLeft = Math.round(midX - L / 2);
                        const snappedTop = Math.round(midY - tpx / 2);

                        cornerLines.push({ snappedLeft, snappedTop, ang, L, 'id': pair.toString() })
                    }
                }

                return (
                    <React.Fragment key={t.id}>
                        <Pressable
                            onLongPress={() => handleTrackLongPress(t)}
                            hitSlop={8}
                            style={{
                                position: 'absolute',
                                left, top, width, height,
                                borderWidth: t.locked ? 3 : 2,
                                borderColor: t.locked ? '#ff3b30' : '#00e913',
                                borderStyle: 'solid',
                            }}
                        />

                        {(t.locked && lockBox) && (
                            <>
                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: 'absolute',
                                        left: lockBox.xmin,
                                        top: lockBox.ymin,
                                        width: lockBox.xmax - lockBox.xmin,
                                        height: lockBox.ymax - lockBox.ymin,
                                        borderWidth: 2,
                                        borderColor: '#8b0700ff',
                                        borderStyle: 'dashed',
                                    }}
                                />

                                {cornerLines.map((line: any) => {
                                    return (
                                        <View
                                            key={line.id}
                                            pointerEvents="none"
                                            style={{
                                                position: 'absolute',
                                                left: line.snappedLeft,
                                                top: line.snappedTop,
                                                width: Math.max(1, Math.round(line.L as number)),
                                                height: 0,
                                                borderWidth: 1,
                                                borderColor: '#8b0700ff',
                                                borderStyle: 'dashed',
                                                transform: [{ rotateZ: `${line.ang}rad` }],
                                            }}
                                        />
                                    )
                                })}
                            </>
                        )}

                        <View
                            pointerEvents="none"
                            style={[
                                styles.tagRow,
                                { position: 'absolute', left, top: top - 15, maxWidth: Math.max(0, sizeRef.current.w - left - 4) }
                            ]}
                        >
                            <Text numberOfLines={1} ellipsizeMode="clip" style={styles.tagText}>
                                {t.label} {(t.label_conf * 100).toFixed(0)}%
                            </Text>

                            {t.locked && (
                                <Image
                                    source={require('./assets/lock.png')}
                                    style={{ width: 15, height: 15, marginLeft: 4, resizeMode: 'contain' }}
                                />
                            )}
                        </View>


                    </React.Fragment>
                );
            })}
        </View>

    )
}

const styles = StyleSheet.create({
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        height: 16,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    tagText: {
        color: 'white',
        fontSize: 12,
        flexShrink: 1,
        includeFontPadding: false,
    },

})