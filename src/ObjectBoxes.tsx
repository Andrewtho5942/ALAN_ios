import React, { useState, useEffect } from 'react'
import { View, Text, Image, StyleSheet, Pressable, Vibration } from 'react-native'
import { Box, Det, Track } from './types.tsx'

type ObjectBoxesProps = {
  tracks: Track[];
  sizeRef: any;
  setTracks: any;
  sendCommand: any;
  isReceiver: boolean;
};


export default function ObjectBoxes({tracks, sizeRef, setTracks, sendCommand, isReceiver} : ObjectBoxesProps) {
  const [lockBox, setLockBox] = useState<any>(null);


    function handleTrackLongPress(t: Track) {
        if (!t.locked) {
            Vibration.vibrate();
            setLockBox({
                'xmin': t.box.xmin * sizeRef.current.w,
                'ymin': t.box.ymin * sizeRef.current.h,
                'xmax': t.box.xmax * sizeRef.current.w,
                'ymax': t.box.ymax * sizeRef.current.h,
            });
        } else {
            setLockBox(null);
        }

        if (isReceiver) {
            // Update tracks so that they all have locked=false, and flip the track that was pressed
            setTracks((prev:any) =>
                prev.map((tr:any) => ({
                    ...tr,
                    locked: tr.id === t.id ? !t.locked : false,
                }))
            );
        } else {
            sendCommand('toggleLockedTrack', t.id)
        }
    }

    useEffect(() => {
        if(tracks.some(t=>t.locked) && !lockBox){
            let t = tracks.find(t=>t.locked);
            if(t){
                setLockBox({
                'xmin': t.box.xmin * sizeRef.current.w,
                'ymin': t.box.ymin * sizeRef.current.h,
                'xmax': t.box.xmax * sizeRef.current.w,
                'ymax': t.box.ymax * sizeRef.current.h,
                });
            }
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