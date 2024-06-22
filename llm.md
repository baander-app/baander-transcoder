Project Path: \\?\D:\Kyoo\transcoder

Source Tree:

```
transcoder
├── go.mod
├── go.sum
├── main.go
├── src
│   ├── audiostream.go
│   ├── cmap.go
│   ├── codec.go
│   ├── extract.go
│   ├── filestream.go
│   ├── hwaccel.go
│   ├── info.go
│   ├── keyframes.go
│   ├── quality.go
│   ├── settings.go
│   ├── stream.go
│   ├── thumbnails.go
│   ├── tracker.go
│   ├── transcoder.go
│   ├── utils.go
│   └── videostream.go
└── utils.go

```````

`\\?\D:\Kyoo\transcoder\go.mod`:

```````mod
module github.com/zoriya/kyoo/transcoder

go 1.21

require github.com/labstack/echo/v4 v4.12.0 // direct

require (
	github.com/disintegration/imaging v1.6.2
	github.com/golang-jwt/jwt v3.2.2+incompatible // indirect
	github.com/labstack/gommon v0.4.2 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/valyala/bytebufferpool v1.0.0 // indirect
	github.com/valyala/fasttemplate v1.2.2 // indirect
	gitlab.com/opennota/screengen v1.0.2
	golang.org/x/crypto v0.22.0 // indirect
	golang.org/x/image v0.10.0 // indirect
	golang.org/x/net v0.24.0 // indirect
	golang.org/x/sys v0.19.0 // indirect
	golang.org/x/text v0.14.0 // indirect
	golang.org/x/time v0.5.0 // indirect
	gopkg.in/vansante/go-ffprobe.v2 v2.2.0
)

```````

`\\?\D:\Kyoo\transcoder\go.sum`:

```````sum
github.com/davecgh/go-spew v1.1.1 h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/disintegration/imaging v1.6.2 h1:w1LecBlG2Lnp8B3jk5zSuNqd7b4DXhcjwek1ei82L+c=
github.com/disintegration/imaging v1.6.2/go.mod h1:44/5580QXChDfwIclfc/PCwrr44amcmDAg8hxG0Ewe4=
github.com/golang-jwt/jwt v3.2.2+incompatible h1:IfV12K8xAKAnZqdXVzCZ+TOjboZ2keLg81eXfW3O+oY=
github.com/golang-jwt/jwt v3.2.2+incompatible/go.mod h1:8pz2t5EyA70fFQQSrl6XZXzqecmYZeUEB8OUGHkxJ+I=
github.com/labstack/echo/v4 v4.12.0 h1:IKpw49IMryVB2p1a4dzwlhP1O2Tf2E0Ir/450lH+kI0=
github.com/labstack/echo/v4 v4.12.0/go.mod h1:UP9Cr2DJXbOK3Kr9ONYzNowSh7HP0aG0ShAyycHSJvM=
github.com/labstack/gommon v0.4.2 h1:F8qTUNXgG1+6WQmqoUWnz8WiEU60mXVVw0P4ht1WRA0=
github.com/labstack/gommon v0.4.2/go.mod h1:QlUFxVM+SNXhDL/Z7YhocGIBYOiwB0mXm1+1bAPHPyU=
github.com/mattn/go-colorable v0.1.13 h1:fFA4WZxdEF4tXPZVKMLwD8oUnCTTo08duU7wxecdEvA=
github.com/mattn/go-colorable v0.1.13/go.mod h1:7S9/ev0klgBDR4GtXTXX8a3vIGJpMovkB8vQcUbaXHg=
github.com/mattn/go-isatty v0.0.16/go.mod h1:kYGgaQfpe5nmfYZH+SKPsOc2e4SrIfOl2e/yFXSvRLM=
github.com/mattn/go-isatty v0.0.20 h1:xfD0iDuEKnDkl03q4limB+vH+GxLEtL/jb4xVJSWWEY=
github.com/mattn/go-isatty v0.0.20/go.mod h1:W+V8PltTTMOvKvAeJH7IuucS94S2C6jfK/D7dTCTo3Y=
github.com/pmezard/go-difflib v1.0.0 h1:4DBwDE0NGyQoBHbLQYPwSUPoCMWR5BEzIk/f1lZbAQM=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/stretchr/testify v1.8.4 h1:CcVxjf3Q8PM0mHUKJCdn+eZZtm5yQwehR5yeSVQQcUk=
github.com/stretchr/testify v1.8.4/go.mod h1:sz/lmYIOXD/1dqDmKjjqLyZ2RngseejIcXlSw2iwfAo=
github.com/valyala/bytebufferpool v1.0.0 h1:GqA5TC/0021Y/b9FG4Oi9Mr3q7XYx6KllzawFIhcdPw=
github.com/valyala/bytebufferpool v1.0.0/go.mod h1:6bBcMArwyJ5K/AmCkWv1jt77kVWyCJ6HpOuEn7z0Csc=
github.com/valyala/fasttemplate v1.2.2 h1:lxLXG0uE3Qnshl9QyaK6XJxMXlQZELvChBOCmQD0Loo=
github.com/valyala/fasttemplate v1.2.2/go.mod h1:KHLXt3tVN2HBp8eijSv/kGJopbvo7S+qRAEEKiv+SiQ=
github.com/yuin/goldmark v1.4.13/go.mod h1:6yULJ656Px+3vBD8DxQVa3kxgyrAnzto9xy5taEt/CY=
gitlab.com/opennota/screengen v1.0.2 h1:GxYTJdAPEzmg5v5CV4dgn45JVW+EcXXAvCxhE7w6UDw=
gitlab.com/opennota/screengen v1.0.2/go.mod h1:4kED4yriw2zslwYmXFCa5qCvEKwleBA7l5OE+d94NTU=
golang.org/x/crypto v0.0.0-20190308221718-c2843e01d9a2/go.mod h1:djNgcEr1/C05ACkg1iLfiJU5Ep61QUkGW8qpdssI0+w=
golang.org/x/crypto v0.0.0-20210921155107-089bfa567519/go.mod h1:GvvjBRRGRdwPK5ydBHafDWAxML/pGHZbMvKqRZ5+Abc=
golang.org/x/crypto v0.22.0 h1:g1v0xeRhjcugydODzvb3mEM9SQ0HGp9s/nh3COQ/C30=
golang.org/x/crypto v0.22.0/go.mod h1:vr6Su+7cTlO45qkww3VDJlzDn0ctJvRgYbC2NvXHt+M=
golang.org/x/image v0.0.0-20191009234506-e7c1f5e7dbb8/go.mod h1:FeLwcggjj3mMvU+oOTbSwawSJRM1uh48EjtB4UJZlP0=
golang.org/x/image v0.10.0 h1:gXjUUtwtx5yOE0VKWq1CH4IJAClq4UGgUA3i+rpON9M=
golang.org/x/image v0.10.0/go.mod h1:jtrku+n79PfroUbvDdeUWMAI+heR786BofxrbiSF+J0=
golang.org/x/mod v0.6.0-dev.0.20220419223038-86c51ed26bb4/go.mod h1:jJ57K6gSWd91VN4djpZkiMVwK6gcyfeH4XE8wZrZaV4=
golang.org/x/mod v0.8.0/go.mod h1:iBbtSCu2XBx23ZKBPSOrRkjjQPZFPuis4dIYUhu/chs=
golang.org/x/net v0.0.0-20190620200207-3b0461eec859/go.mod h1:z5CRVTTTmAJ677TzLLGU+0bjPO0LkuOLi4/5GtJWs/s=
golang.org/x/net v0.0.0-20210226172049-e18ecbb05110/go.mod h1:m0MpNAwzfU5UDzcl9v0D8zg8gWTRqZa9RBIspLL5mdg=
golang.org/x/net v0.0.0-20220722155237-a158d28d115b/go.mod h1:XRhObCWvk6IyKnWLug+ECip1KBveYUHfp+8e9klMJ9c=
golang.org/x/net v0.6.0/go.mod h1:2Tu9+aMcznHK/AK1HMvgo6xiTLG5rD5rZLDS+rp2Bjs=
golang.org/x/net v0.24.0 h1:1PcaxkF854Fu3+lvBIx5SYn9wRlBzzcnHZSiaFFAb0w=
golang.org/x/net v0.24.0/go.mod h1:2Q7sJY5mzlzWjKtYUEXSlBWCdyaioyXzRB2RtU8KVE8=
golang.org/x/sync v0.0.0-20190423024810-112230192c58/go.mod h1:RxMgew5VJxzue5/jJTE5uejpjVlOe/izrB70Jof72aM=
golang.org/x/sync v0.0.0-20220722155255-886fb9371eb4/go.mod h1:RxMgew5VJxzue5/jJTE5uejpjVlOe/izrB70Jof72aM=
golang.org/x/sync v0.1.0/go.mod h1:RxMgew5VJxzue5/jJTE5uejpjVlOe/izrB70Jof72aM=
golang.org/x/sys v0.0.0-20190215142949-d0b11bdaac8a/go.mod h1:STP8DvDyc/dI5b8T5hshtkjS+E42TnysNCUPdjciGhY=
golang.org/x/sys v0.0.0-20201119102817-f84b799fce68/go.mod h1:h1NjWce9XRLGQEsW7wpKNCjG9DtNlClVuFLEZdDNbEs=
golang.org/x/sys v0.0.0-20210615035016-665e8c7367d1/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
golang.org/x/sys v0.0.0-20220520151302-bc2c85ada10a/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
golang.org/x/sys v0.0.0-20220722155257-8c9f86f7a55f/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
golang.org/x/sys v0.0.0-20220811171246-fbc7d0a398ab/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
golang.org/x/sys v0.5.0/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
golang.org/x/sys v0.6.0/go.mod h1:oPkhp1MJrh7nUepCBck5+mAzfO9JrbApNNgaTdGDITg=
golang.org/x/sys v0.19.0 h1:q5f1RH2jigJ1MoAWp2KTp3gm5zAGFUTarQZ5U386+4o=
golang.org/x/sys v0.19.0/go.mod h1:/VUhepiaJMQUp4+oa/7Zr1D23ma6VTLIYjOOTFZPUcA=
golang.org/x/term v0.0.0-20201126162022-7de9c90e9dd1/go.mod h1:bj7SfCRtBDWHUb9snDiAeCFNEtKQo2Wmx5Cou7ajbmo=
golang.org/x/term v0.0.0-20210927222741-03fcf44c2211/go.mod h1:jbD1KX2456YbFQfuXm/mYQcufACuNUgVhRMnK/tPxf8=
golang.org/x/term v0.5.0/go.mod h1:jMB1sMXY+tzblOD4FWmEbocvup2/aLOaQEp7JmGp78k=
golang.org/x/text v0.3.0/go.mod h1:NqM8EUOU14njkJ3fqMW+pc6Ldnwhi/IjpwHt7yyuwOQ=
golang.org/x/text v0.3.3/go.mod h1:5Zoc/QRtKVWzQhOtBMvqHzDpF6irO9z98xDceosuGiQ=
golang.org/x/text v0.3.7/go.mod h1:u+2+/6zg+i71rQMx5EYifcz6MCKuco9NR6JIITiCfzQ=
golang.org/x/text v0.7.0/go.mod h1:mrYo+phRRbMaCq/xk9113O4dZlRixOauAjOtrjsXDZ8=
golang.org/x/text v0.11.0/go.mod h1:TvPlkZtksWOMsz7fbANvkp4WM8x/WCo/om8BMLbz+aE=
golang.org/x/text v0.14.0 h1:ScX5w1eTa3QqT8oi6+ziP7dTV1S2+ALU0bI+0zXKWiQ=
golang.org/x/text v0.14.0/go.mod h1:18ZOQIKpY8NJVqYksKHtTdi31H5itFRjB5/qKTNYzSU=
golang.org/x/time v0.5.0 h1:o7cqy6amK/52YcAKIPlM3a+Fpj35zvRj2TP+e1xFSfk=
golang.org/x/time v0.5.0/go.mod h1:3BpzKBy/shNhVucY/MWOyx10tF3SFh9QdLuxbVysPQM=
golang.org/x/tools v0.0.0-20180917221912-90fa682c2a6e/go.mod h1:n7NCudcB/nEzxVGmLbDWY5pfWTLqBcC2KZ6jyYvM4mQ=
golang.org/x/tools v0.0.0-20191119224855-298f0cb1881e/go.mod h1:b+2E5dAYhXwXZwtnZ6UAqBI28+e2cm9otk0dWdXHAEo=
golang.org/x/tools v0.1.12/go.mod h1:hNGJHUnrk76NpqgfD5Aqm5Crs+Hm0VOH/i9J2+nxYbc=
golang.org/x/tools v0.6.0/go.mod h1:Xwgl3UAJ/d3gWutnCtw505GrjyAbvKui8lOU390QaIU=
golang.org/x/xerrors v0.0.0-20190717185122-a985d3407aa7/go.mod h1:I/5z698sn9Ka8TeJc9MKroUUfqBBauWjQqLJ2OPfmY0=
gopkg.in/vansante/go-ffprobe.v2 v2.2.0 h1:iuOqTsbfYuqIz4tAU9NWh22CmBGxlGHdgj4iqP+NUmY=
gopkg.in/vansante/go-ffprobe.v2 v2.2.0/go.mod h1:qF0AlAjk7Nqzqf3y333Ly+KxN3cKF2JqA3JT5ZheUGE=
gopkg.in/yaml.v3 v3.0.1 h1:fxVm/GzAzEWqLHuvctI91KS9hhNmmWOoWu0XTYJS7CA=
gopkg.in/yaml.v3 v3.0.1/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=

```````

`\\?\D:\Kyoo\transcoder\main.go`:

```````go
package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/zoriya/kyoo/transcoder/src"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// Direct video
//
// Retrieve the raw video stream, in the same container as the one on the server. No transcoding or
// transmuxing is done.
//
// Path: /:path/direct
func DirectStream(c echo.Context) error {
	path, _, err := GetPath(c)
	if err != nil {
		return err
	}
	return c.File(path)
}

// Get master playlist
//
// Get a master playlist containing all possible video qualities and audios available for this resource.
// Note that the direct stream is missing (since the direct is not an hls stream) and
// subtitles/fonts are not included to support more codecs than just webvtt.
//
// Path: /:path/master.m3u8
func (h *Handler) GetMaster(c echo.Context) error {
	client, err := GetClientId(c)
	if err != nil {
		return err
	}
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	ret, err := h.transcoder.GetMaster(path, client, sha)
	if err != nil {
		return err
	}
	return c.String(http.StatusOK, ret)
}

// Transcode video
//
// Transcode the video to the selected quality.
// This route can take a few seconds to respond since it will way for at least one segment to be
// available.
//
// Path: /:path/:quality/index.m3u8
func (h *Handler) GetVideoIndex(c echo.Context) error {
	quality, err := src.QualityFromString(c.Param("quality"))
	if err != nil {
		return err
	}
	client, err := GetClientId(c)
	if err != nil {
		return err
	}
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	ret, err := h.transcoder.GetVideoIndex(path, quality, client, sha)
	if err != nil {
		return err
	}
	return c.String(http.StatusOK, ret)
}

// Transcode audio
//
// Get the selected audio
// This route can take a few seconds to respond since it will way for at least one segment to be
// available.
//
// Path: /:path/audio/:audio/index.m3u8
func (h *Handler) GetAudioIndex(c echo.Context) error {
	audio, err := strconv.ParseInt(c.Param("audio"), 10, 32)
	if err != nil {
		return err
	}
	client, err := GetClientId(c)
	if err != nil {
		return err
	}
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	ret, err := h.transcoder.GetAudioIndex(path, int32(audio), client, sha)
	if err != nil {
		return err
	}
	return c.String(http.StatusOK, ret)
}

// Get transmuxed chunk
//
// Retrieve a chunk of a transmuxed video.
//
// Path: /:path/:quality/segments-:chunk.ts
func (h *Handler) GetVideoSegment(c echo.Context) error {
	quality, err := src.QualityFromString(c.Param("quality"))
	if err != nil {
		return err
	}
	segment, err := ParseSegment(c.Param("chunk"))
	if err != nil {
		return err
	}
	client, err := GetClientId(c)
	if err != nil {
		return err
	}
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	ret, err := h.transcoder.GetVideoSegment(path, quality, segment, client, sha)
	if err != nil {
		return err
	}
	return c.File(ret)
}

// Get audio chunk
//
// Retrieve a chunk of a transcoded audio.
//
// Path: /:path/audio/:audio/segments-:chunk.ts
func (h *Handler) GetAudioSegment(c echo.Context) error {
	audio, err := strconv.ParseInt(c.Param("audio"), 10, 32)
	if err != nil {
		return err
	}
	segment, err := ParseSegment(c.Param("chunk"))
	if err != nil {
		return err
	}
	client, err := GetClientId(c)
	if err != nil {
		return err
	}
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	ret, err := h.transcoder.GetAudioSegment(path, int32(audio), segment, client, sha)
	if err != nil {
		return err
	}
	return c.File(ret)
}

// Identify
//
// Identify metadata about a file.
//
// Path: /:path/info
func (h *Handler) GetInfo(c echo.Context) error {
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	ret, err := src.GetInfo(path, sha)
	if err != nil {
		return err
	}
	// Run extractors to have them in cache
	src.Extract(ret.Path, sha)
	go src.ExtractThumbnail(ret.Path, sha)
	return c.JSON(http.StatusOK, ret)
}

// Get attachments
//
// Get a specific attachment.
//
// Path: /:path/attachment/:name
func (h *Handler) GetAttachment(c echo.Context) error {
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}
	name := c.Param("name")
	if err := SanitizePath(name); err != nil {
		return err
	}

	wait, err := src.Extract(path, sha)
	if err != nil {
		return err
	}
	<-wait

	ret := fmt.Sprintf("%s/%s/att/%s", src.Settings.Metadata, sha, name)
	return c.File(ret)
}

// Get subtitle
//
// Get a specific subtitle.
//
// Path: /:path/subtitle/:name
func (h *Handler) GetSubtitle(c echo.Context) error {
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}
	name := c.Param("name")
	if err := SanitizePath(name); err != nil {
		return err
	}

	wait, err := src.Extract(path, sha)
	if err != nil {
		return err
	}
	<-wait

	ret := fmt.Sprintf("%s/%s/sub/%s", src.Settings.Metadata, sha, name)
	return c.File(ret)
}

// Get thumbnail sprite
//
// Get a sprite file containing all the thumbnails of the show.
//
// Path: /:path/thumbnails.png
func (h *Handler) GetThumbnails(c echo.Context) error {
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	out, err := src.ExtractThumbnail(path, sha)
	if err != nil {
		return err
	}

	return c.File(fmt.Sprintf("%s/sprite.png", out))
}

// Get thumbnail vtt
//
// Get a vtt file containing timing/position of thumbnails inside the sprite file.
// https://developer.bitmovin.com/playback/docs/webvtt-based-thumbnails for more info.
//
// Path: /:path/:resource/:slug/thumbnails.vtt
func (h *Handler) GetThumbnailsVtt(c echo.Context) error {
	path, sha, err := GetPath(c)
	if err != nil {
		return err
	}

	out, err := src.ExtractThumbnail(path, sha)
	if err != nil {
		return err
	}

	return c.File(fmt.Sprintf("%s/sprite.vtt", out))
}

type Handler struct {
	transcoder *src.Transcoder
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.HTTPErrorHandler = ErrorHandler

	transcoder, err := src.NewTranscoder()
	if err != nil {
		e.Logger.Fatal(err)
		return
	}
	h := Handler{
		transcoder: transcoder,
	}

	e.GET("/:path/direct", DirectStream)
	e.GET("/:path/master.m3u8", h.GetMaster)
	e.GET("/:path/:quality/index.m3u8", h.GetVideoIndex)
	e.GET("/:path/audio/:audio/index.m3u8", h.GetAudioIndex)
	e.GET("/:path/:quality/:chunk", h.GetVideoSegment)
	e.GET("/:path/audio/:audio/:chunk", h.GetAudioSegment)
	e.GET("/:path/info", h.GetInfo)
	e.GET("/:path/thumbnails.png", h.GetThumbnails)
	e.GET("/:path/thumbnails.vtt", h.GetThumbnailsVtt)
	e.GET("/:path/attachment/:name", h.GetAttachment)
	e.GET("/:path/subtitle/:name", h.GetSubtitle)

	e.Logger.Fatal(e.Start(":7666"))
}

```````

`\\?\D:\Kyoo\transcoder\src\audiostream.go`:

```````go
package src

import (
	"fmt"
	"log"
)

type AudioStream struct {
	Stream
	index int32
}

func NewAudioStream(file *FileStream, idx int32) *AudioStream {
	log.Printf("Creating a audio stream %d for %s", idx, file.Path)
	ret := new(AudioStream)
	ret.index = idx
	NewStream(file, ret, &ret.Stream)
	return ret
}

func (as *AudioStream) getOutPath(encoder_id int) string {
	return fmt.Sprintf("%s/segment-a%d-%d-%%d.ts", as.file.Out, as.index, encoder_id)
}

func (as *AudioStream) getFlags() Flags {
	return AudioF
}

func (as *AudioStream) getTranscodeArgs(segments string) []string {
	return []string{
		"-map", fmt.Sprintf("0:a:%d", as.index),
		"-c:a", "aac",
		// TODO: Support 5.1 audio streams.
		"-ac", "2",
		// TODO: Support multi audio qualities.
		"-b:a", "128k",
	}
}

```````

`\\?\D:\Kyoo\transcoder\src\cmap.go`:

```````go
package src

import "sync"

type CMap[K comparable, V any] struct {
	data map[K]V
	lock sync.RWMutex
}

func NewCMap[K comparable, V any]() CMap[K, V] {
	return CMap[K, V]{
		data: make(map[K]V),
	}
}

func (m *CMap[K, V]) Get(key K) (V, bool) {
	m.lock.RLock()
	defer m.lock.RUnlock()
	ret, ok := m.data[key]
	return ret, ok
}

func (m *CMap[K, V]) GetOrCreate(key K, create func() V) (V, bool) {
	m.lock.RLock()
	ret, ok := m.data[key]
	if ok {
		m.lock.RUnlock()
		return ret, false
	}
	m.lock.RUnlock()

	// data does not exist, create it
	m.lock.Lock()
	defer m.lock.Unlock()

	// check if another gorountine already created it before we could lock
	ret, ok = m.data[key]
	if ok {
		return ret, false
	}

	val := create()
	m.data[key] = val
	return val, true
}

func (m *CMap[K, V]) GetOrSet(key K, val V) (V, bool) {
	return m.GetOrCreate(key, func() V { return val })
}

func (m *CMap[K, V]) Set(key K, val V) {
	m.lock.Lock()
	defer m.lock.Unlock()

	m.data[key] = val
}

func (m *CMap[K, V]) Remove(key K) {
	m.lock.Lock()
	defer m.lock.Unlock()

	delete(m.data, key)
}

func (m *CMap[K, V]) GetAndRemove(key K) (V, bool) {
	m.lock.Lock()
	defer m.lock.Unlock()

	val, ok := m.data[key]
	delete(m.data, key)
	return val, ok
}

```````

`\\?\D:\Kyoo\transcoder\src\codec.go`:

```````go
package src

import (
	"fmt"
	"log"
	"strings"

	"gopkg.in/vansante/go-ffprobe.v2"
)

// convert mediainfo to RFC 6381, waiting for either of those tickets to be resolved:
//
//	https://sourceforge.net/p/mediainfo/feature-requests/499
//	https://trac.ffmpeg.org/ticket/6617
//
// this code is addapted from https://github.com/jellyfin/jellyfin/blob/master/Jellyfin.Api/Helpers/HlsCodecStringHelpers.cs
// and https://git.ffmpeg.org/gitweb/ffmpeg.git/blob/HEAD%3a/libavformat/hlsenc.c#l344
func GetMimeCodec(stream *ffprobe.Stream) *string {
	switch stream.CodecName {
	case "h264":
		ret := "avc1"

		switch strings.ToLower(stream.Profile) {
		case "high":
			ret += ".6400"
		case "main":
			ret += ".4D40"
		case "baseline":
			ret += ".42E0"
		default:
			// Default to constrained baseline if profile is invalid
			ret += ".4240"
		}

		ret += fmt.Sprintf("%02x", stream.Level)
		return &ret

	case "h265", "hevc":
		// The h265 syntax is a bit of a mystery at the time this comment was written.
		// This is what I've found through various sources:
		// FORMAT: [codecTag].[profile].[constraint?].L[level * 30].[UNKNOWN]
		ret := "hvc1"

		if stream.Profile == "main 10" {
			ret += ".2.4"
		} else {
			ret += ".1.4"
		}

		ret += fmt.Sprintf(".L%02X.BO", stream.Level)
		return &ret

	case "av1":
		// https://aomedia.org/av1/specification/annex-a/
		// FORMAT: [codecTag].[profile].[level][tier].[bitDepth]
		ret := "av01"

		switch strings.ToLower(stream.Profile) {
		case "main":
			ret += ".0"
		case "high":
			ret += ".1"
		case "professional":
			ret += ".2"
		default:
		}

		// not sure about this field, we want pixel bit depth
		bitdepth := ParseUint(stream.BitsPerRawSample)
		if bitdepth != 8 && bitdepth != 10 && bitdepth != 12 {
			// Default to 8 bits
			bitdepth = 8
		}

		tierflag := 'M'
		ret += fmt.Sprintf(".%02X%c.%02d", stream.Level, tierflag, bitdepth)

		return &ret

	case "aac":
		ret := "mp4a"

		switch strings.ToLower(stream.Profile) {
		case "he":
			ret += ".40.5"
		case "lc":
			ret += ".40.2"
		default:
			ret += ".40.2"
		}

		return &ret

	case "mp3":
		ret := "mp4a.40.34"
		return &ret

	case "opus":
		ret := "Opus"
		return &ret

	case "ac3":
		ret := "mp4a.a5"
		return &ret

	case "eac3":
		ret := "mp4a.a6"
		return &ret

	case "flac":
		ret := "fLaC"
		return &ret

	case "alac":
		ret := "alac"
		return &ret

	default:
		log.Printf("No known mime format for: %s", stream.CodecName)
		return nil
	}
}

```````

`\\?\D:\Kyoo\transcoder\src\extract.go`:

```````go
package src

import (
	"fmt"
	"log"
	"os"
	"os/exec"
)

var extracted = NewCMap[string, <-chan struct{}]()

func Extract(path string, sha string) (<-chan struct{}, error) {
	ret := make(chan struct{})
	existing, created := extracted.GetOrSet(sha, ret)
	if !created {
		return existing, nil
	}

	go func() {
		defer printExecTime("Starting extraction of %s", path)()
		info, err := GetInfo(path, sha)
		if err != nil {
			extracted.Remove(sha)
			close(ret)
			return
		}
		attachment_path := fmt.Sprintf("%s/%s/att", Settings.Metadata, sha)
		subs_path := fmt.Sprintf("%s/%s/sub", Settings.Metadata, sha)
		os.MkdirAll(attachment_path, 0o644)
		os.MkdirAll(subs_path, 0o755)

		// If there is no subtitles, there is nothing to extract (also fonts would be useless).
		if len(info.Subtitles) == 0 {
			close(ret)
			return
		}

		cmd := exec.Command(
			"ffmpeg",
			"-dump_attachment:t", "",
			// override old attachments
			"-y",
			"-i", path,
		)
		cmd.Dir = attachment_path

		for _, sub := range info.Subtitles {
			if ext := sub.Extension; ext != nil {
				cmd.Args = append(
					cmd.Args,
					"-map", fmt.Sprintf("0:s:%d", sub.Index),
					"-c:s", "copy",
					fmt.Sprintf("%s/%d.%s", subs_path, sub.Index, *ext),
				)
			}
		}
		log.Printf("Starting extraction with the command: %s", cmd)
		cmd.Stdout = nil
		err = cmd.Run()
		if err != nil {
			extracted.Remove(sha)
			fmt.Println("Error starting ffmpeg extract:", err)
		}
		close(ret)
	}()

	return ret, nil
}

```````

`\\?\D:\Kyoo\transcoder\src\filestream.go`:

```````go
package src

import (
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"sync"
)

type FileStream struct {
	ready     sync.WaitGroup
	err       error
	Path      string
	Out       string
	Keyframes *Keyframe
	Info      *MediaInfo
	videos    CMap[Quality, *VideoStream]
	audios    CMap[int32, *AudioStream]
}

func NewFileStream(path string, sha string) *FileStream {
	ret := &FileStream{
		Path:   path,
		Out:    fmt.Sprintf("%s/%s", Settings.Outpath, sha),
		videos: NewCMap[Quality, *VideoStream](),
		audios: NewCMap[int32, *AudioStream](),
	}

	ret.ready.Add(1)
	go func() {
		defer ret.ready.Done()
		info, err := GetInfo(path, sha)
		ret.Info = info
		if err != nil {
			ret.err = err
		}
	}()

	ret.ready.Add(1)
	go func() {
		defer ret.ready.Done()
		ret.Keyframes = GetKeyframes(sha, path)
	}()

	return ret
}

func (fs *FileStream) Kill() {
	fs.videos.lock.Lock()
	defer fs.videos.lock.Unlock()
	fs.audios.lock.Lock()
	defer fs.audios.lock.Unlock()

	for _, s := range fs.videos.data {
		s.Kill()
	}
	for _, s := range fs.audios.data {
		s.Kill()
	}
}

func (fs *FileStream) Destroy() {
	log.Printf("Removing all transcode cache files for %s", fs.Path)
	fs.Kill()
	_ = os.RemoveAll(fs.Out)
}

func (fs *FileStream) GetMaster() string {
	master := "#EXTM3U\n"
	if fs.Info.Video != nil {
		var transmux_quality Quality
		for _, quality := range Qualities {
			if quality.Height() >= fs.Info.Video.Quality.Height() || quality.AverageBitrate() >= fs.Info.Video.Bitrate {
				transmux_quality = quality
				break
			}
		}
		// original stream
		{
			bitrate := float64(fs.Info.Video.Bitrate)
			master += "#EXT-X-STREAM-INF:"
			master += fmt.Sprintf("AVERAGE-BANDWIDTH=%d,", int(math.Min(bitrate*0.8, float64(transmux_quality.AverageBitrate()))))
			master += fmt.Sprintf("BANDWIDTH=%d,", int(math.Min(bitrate, float64(transmux_quality.MaxBitrate()))))
			master += fmt.Sprintf("RESOLUTION=%dx%d,", fs.Info.Video.Width, fs.Info.Video.Height)
			if fs.Info.Video.MimeCodec != nil {
				master += fmt.Sprintf("CODECS=\"%s\",", *fs.Info.Video.MimeCodec)
			}
			master += "AUDIO=\"audio\","
			master += "CLOSED-CAPTIONS=NONE\n"
			master += fmt.Sprintf("./%s/index.m3u8\n", Original)
		}

		aspectRatio := float32(fs.Info.Video.Width) / float32(fs.Info.Video.Height)
		// codec is the prefix + the level, the level is not part of the codec we want to compare for the same_codec check bellow
		transmux_prefix := "avc1.6400"
		transmux_codec := transmux_prefix + "28"

		for _, quality := range Qualities {
			same_codec := fs.Info.Video.MimeCodec != nil && strings.HasPrefix(*fs.Info.Video.MimeCodec, transmux_prefix)
			inc_lvl := quality.Height() < fs.Info.Video.Quality.Height() ||
				(quality.Height() == fs.Info.Video.Quality.Height() && !same_codec)

			if inc_lvl {
				master += "#EXT-X-STREAM-INF:"
				master += fmt.Sprintf("AVERAGE-BANDWIDTH=%d,", quality.AverageBitrate())
				master += fmt.Sprintf("BANDWIDTH=%d,", quality.MaxBitrate())
				master += fmt.Sprintf("RESOLUTION=%dx%d,", int(aspectRatio*float32(quality.Height())+0.5), quality.Height())
				master += fmt.Sprintf("CODECS=\"%s\",", transmux_codec)
				master += "AUDIO=\"audio\","
				master += "CLOSED-CAPTIONS=NONE\n"
				master += fmt.Sprintf("./%s/index.m3u8\n", quality)
			}
		}
	}
	for _, audio := range fs.Info.Audios {
		master += "#EXT-X-MEDIA:TYPE=AUDIO,"
		master += "GROUP-ID=\"audio\","
		if audio.Language != nil {
			master += fmt.Sprintf("LANGUAGE=\"%s\",", *audio.Language)
		}
		if audio.Title != nil {
			master += fmt.Sprintf("NAME=\"%s\",", *audio.Title)
		} else if audio.Language != nil {
			master += fmt.Sprintf("NAME=\"%s\",", *audio.Language)
		} else {
			master += fmt.Sprintf("NAME=\"Audio %d\",", audio.Index)
		}
		if audio.IsDefault {
			master += "DEFAULT=YES,"
		}
		master += fmt.Sprintf("URI=\"./audio/%d/index.m3u8\"\n", audio.Index)
	}
	return master
}

func (fs *FileStream) getVideoStream(quality Quality) *VideoStream {
	stream, _ := fs.videos.GetOrCreate(quality, func() *VideoStream {
		return NewVideoStream(fs, quality)
	})
	return stream
}

func (fs *FileStream) GetVideoIndex(quality Quality) (string, error) {
	stream := fs.getVideoStream(quality)
	return stream.GetIndex()
}

func (fs *FileStream) GetVideoSegment(quality Quality, segment int32) (string, error) {
	stream := fs.getVideoStream(quality)
	return stream.GetSegment(segment)
}

func (fs *FileStream) getAudioStream(audio int32) *AudioStream {
	stream, _ := fs.audios.GetOrCreate(audio, func() *AudioStream {
		return NewAudioStream(fs, audio)
	})
	return stream
}

func (fs *FileStream) GetAudioIndex(audio int32) (string, error) {
	stream := fs.getAudioStream(audio)
	return stream.GetIndex()
}

func (fs *FileStream) GetAudioSegment(audio int32, segment int32) (string, error) {
	stream := fs.getAudioStream(audio)
	return stream.GetSegment(segment)
}

```````

`\\?\D:\Kyoo\transcoder\src\hwaccel.go`:

```````go
package src

import (
	"log"
	"os"
)

func DetectHardwareAccel() HwAccelT {
	name := GetEnvOr("GOCODER_HWACCEL", "disabled")
	if name == "disabled" {
		name = GetEnvOr("GOTRANSCODER_HWACCEL", "disabled")
	}
	log.Printf("Using hardware acceleration: %s", name)

	// superfast or ultrafast would produce a file extremly big so we prever to ignore them. Fast is available on all hw accel modes
	// so we use that by default.
	// vaapi does not have any presets so this flag is unused for vaapi hwaccel.
	preset := GetEnvOr("GOCODER_PRESET", "fast")

	switch name {
	case "disabled":
		return HwAccelT{
			Name:        "disabled",
			DecodeFlags: []string{},
			EncodeFlags: []string{
				"-c:v", "libx264",
				"-preset", preset,
				// sc_threshold is a scene detection mechanisum used to create a keyframe when the scene changes
				// this is on by default and inserts keyframes where we don't want to (it also breaks force_key_frames)
				// we disable it to prevents whole scenes from behing removed due to the -f segment failing to find the corresonding keyframe
				"-sc_threshold", "0",
				// force 8bits output (by default it keeps the same as the source but 10bits is not playable on some devices)
				"-pix_fmt", "yuv420p",
			},
			// we could put :force_original_aspect_ratio=decrease:force_divisible_by=2 here but we already calculate a correct width and
			// aspect ratio in our code so there is no need.
			ScaleFilter: "scale=%d:%d",
		}
	case "vaapi":
		return HwAccelT{
			Name: name,
			DecodeFlags: []string{
				"-hwaccel", "vaapi",
				"-hwaccel_device", GetEnvOr("GOCODER_VAAPI_RENDERER", "/dev/dri/renderD128"),
				"-hwaccel_output_format", "vaapi",
			},
			EncodeFlags: []string{
				// h264_vaapi does not have any preset or scenecut flags.
				"-c:v", "h264_vaapi",
			},
			// if the hardware decoder could not work and fallbacked to soft decode, we need to instruct ffmpeg to
			// upload back frames to gpu space (after converting them)
			// see https://trac.ffmpeg.org/wiki/Hardware/VAAPI#Encoding for more info
			// we also need to force the format to be nv12 since 10bits is not supported via hwaccel.
			// this filter is equivalent to this pseudocode:
			// if (vaapi) {
			//   hwupload, passthrough, keep vaapi as is
			//   convert whatever to nv12 on GPU
			// } else {
			//   convert whatever to nv12 on CPU
			//   hwupload to vaapi(nv12)
			//   convert whatever to nv12 on GPU // scale_vaapi doesn't support passthrough option, so it has to make a copy
			// }
			// See https://www.reddit.com/r/ffmpeg/comments/1bqn60w/hardware_accelerated_decoding_without_hwdownload/ for more info
			ScaleFilter: "format=nv12|vaapi,hwupload,scale_vaapi=%d:%d:format=nv12",
		}
	case "qsv", "intel":
		return HwAccelT{
			Name: name,
			DecodeFlags: []string{
				"-hwaccel", "qsv",
				"-qsv_device", GetEnvOr("GOCODER_QSV_RENDERER", "/dev/dri/renderD128"),
				"-hwaccel_output_format", "qsv",
			},
			EncodeFlags: []string{
				"-c:v", "h264_qsv",
				"-preset", preset,
			},
			// see note on ScaleFilter of the vaapi HwAccel, this is the same filter but adapted to qsv
			ScaleFilter: "format=nv12|qsv,hwupload,scale_qsv=%d:%d:format=nv12",
		}
	case "nvidia":
		return HwAccelT{
			Name: "nvidia",
			DecodeFlags: []string{
				"-hwaccel", "cuda",
				// this flag prevents data to go from gpu space to cpu space
				// it forces the whole dec/enc to be on the gpu. We want that.
				"-hwaccel_output_format", "cuda",
			},
			EncodeFlags: []string{
				"-c:v", "h264_nvenc",
				"-preset", preset,
				// the exivalent of -sc_threshold on nvidia.
				"-no-scenecut", "1",
			},
			// see note on ScaleFilter of the vaapi HwAccel, this is the same filter but adapted to cuda
			ScaleFilter: "format=nv12|cuda,hwupload,scale_cuda=%d:%d:format=nv12",
		}
	default:
		log.Printf("No hardware accelerator named: %s", name)
		os.Exit(2)
		panic("unreachable")
	}
}

```````

`\\?\D:\Kyoo\transcoder\src\info.go`:

```````go
package src

import (
	"cmp"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/text/language"
	"gopkg.in/vansante/go-ffprobe.v2"
)

type MediaInfo struct {
	// The sha1 of the video file.
	Sha string `json:"sha"`
	/// The internal path of the video file.
	Path string `json:"path"`
	/// The extension currently used to store this video file
	Extension string `json:"extension"`
	/// The whole mimetype (defined as the RFC 6381). ex: `video/mp4; codecs="avc1.640028, mp4a.40.2"`
	MimeCodec *string `json:"mimeCodec"`
	/// The file size of the video file.
	Size uint64 `json:"size"`
	/// The length of the media in seconds.
	Duration float32 `json:"duration"`
	/// The container of the video file of this episode.
	Container *string `json:"container"`
	/// The video codec and informations.
	Video *Video `json:"video"`
	/// The list of videos if there are multiples.
	Videos []Video `json:"videos"`
	/// The list of audio tracks.
	Audios []Audio `json:"audios"`
	/// The list of subtitles tracks.
	Subtitles []Subtitle `json:"subtitles"`
	/// The list of fonts that can be used to display subtitles.
	Fonts []string `json:"fonts"`
	/// The list of chapters. See Chapter for more information.
	Chapters []Chapter `json:"chapters"`
}

type Video struct {
	/// The human readable codec name.
	Codec string `json:"codec"`
	/// The codec of this stream (defined as the RFC 6381).
	MimeCodec *string `json:"mimeCodec"`
	/// The language of this stream (as a ISO-639-2 language code)
	Language *string `json:"language"`
	/// The max quality of this video track.
	Quality Quality `json:"quality"`
	/// The width of the video stream
	Width uint32 `json:"width"`
	/// The height of the video stream
	Height uint32 `json:"height"`
	/// The average bitrate of the video in bytes/s
	Bitrate uint32 `json:"bitrate"`
}

type Audio struct {
	/// The index of this track on the media.
	Index uint32 `json:"index"`
	/// The title of the stream.
	Title *string `json:"title"`
	/// The language of this stream (as a IETF-BCP-47 language code)
	Language *string `json:"language"`
	/// The human readable codec name.
	Codec string `json:"codec"`
	/// The codec of this stream (defined as the RFC 6381).
	MimeCodec *string `json:"mimeCodec"`
	/// Is this stream the default one of it's type?
	IsDefault bool `json:"isDefault"`
	/// Is this stream tagged as forced? (useful only for subtitles)
	IsForced bool `json:"isForced"`
}

type Subtitle struct {
	/// The index of this track on the media.
	Index uint32 `json:"index"`
	/// The title of the stream.
	Title *string `json:"title"`
	/// The language of this stream (as a IETF-BCP-47 language code)
	Language *string `json:"language"`
	/// The codec of this stream.
	Codec string `json:"codec"`
	/// The extension for the codec.
	Extension *string `json:"extension"`
	/// Is this stream the default one of it's type?
	IsDefault bool `json:"isDefault"`
	/// Is this stream tagged as forced? (useful only for subtitles)
	IsForced bool `json:"isForced"`
	/// The link to access this subtitle.
	Link *string `json:"link"`
}

type Chapter struct {
	/// The start time of the chapter (in second from the start of the episode).
	StartTime float32 `json:"startTime"`
	/// The end time of the chapter (in second from the start of the episode).
	EndTime float32 `json:"endTime"`
	/// The name of this chapter. This should be a human-readable name that could be presented to the user.
	Name string `json:"name"`
	// TODO: add a type field for Opening, Credits...
}

func ParseFloat(str string) float32 {
	f, err := strconv.ParseFloat(str, 32)
	if err != nil {
		return 0
	}
	return float32(f)
}

func ParseUint(str string) uint32 {
	i, err := strconv.ParseUint(str, 10, 32)
	if err != nil {
		println(str)
		return 0
	}
	return uint32(i)
}

func ParseUint64(str string) uint64 {
	i, err := strconv.ParseUint(str, 10, 64)
	if err != nil {
		println(str)
		return 0
	}
	return i
}

func Map[T, U any](ts []T, f func(T, int) U) []U {
	us := make([]U, len(ts))
	for i := range ts {
		us[i] = f(ts[i], i)
	}
	return us
}

func MapStream[T any](streams []*ffprobe.Stream, kind ffprobe.StreamType, mapper func(*ffprobe.Stream, uint32) T) []T {
	count := 0
	for _, stream := range streams {
		if stream.CodecType == string(kind) {
			count++
		}
	}
	ret := make([]T, count)

	i := uint32(0)
	for _, stream := range streams {
		if stream.CodecType == string(kind) {
			ret[i] = mapper(stream, i)
			i++
		}
	}
	return ret
}

func OrNull(str string) *string {
	if str == "" {
		return nil
	}
	return &str
}

func NullIfUnd(str string) *string {
	if str == "und" {
		return nil
	}
	return &str
}

var SubtitleExtensions = map[string]string{
	"subrip": "srt",
	"ass":    "ass",
	"vtt":    "vtt",
}

type MICache struct {
	info  *MediaInfo
	ready sync.WaitGroup
}

var infos = NewCMap[string, *MICache]()

func GetInfo(path string, sha string) (*MediaInfo, error) {
	var err error

	ret, _ := infos.GetOrCreate(sha, func() *MICache {
		mi := &MICache{info: &MediaInfo{Sha: sha}}
		mi.ready.Add(1)
		go func() {
			save_path := fmt.Sprintf("%s/%s/info.json", Settings.Metadata, sha)
			if err := getSavedInfo(save_path, mi.info); err == nil {
				log.Printf("Using mediainfo cache on filesystem for %s", path)
				mi.ready.Done()
				return
			}

			var val *MediaInfo
			val, err = getInfo(path)
			if err == nil {
				*mi.info = *val
				mi.info.Sha = sha
			}
			mi.ready.Done()
			saveInfo(save_path, mi.info)
		}()
		return mi
	})
	ret.ready.Wait()
	return ret.info, err
}

func getSavedInfo[T any](save_path string, mi *T) error {
	saved_file, err := os.Open(save_path)
	if err != nil {
		return err
	}
	saved, err := io.ReadAll(saved_file)
	if err != nil {
		return err
	}
	err = json.Unmarshal([]byte(saved), mi)
	if err != nil {
		return err
	}
	return nil
}

func saveInfo[T any](save_path string, mi *T) error {
	content, err := json.Marshal(*mi)
	if err != nil {
		return err
	}
	return os.WriteFile(save_path, content, 0o644)
}

func getInfo(path string) (*MediaInfo, error) {
	defer printExecTime("mediainfo for %s", path)()

	ctx, cancelFn := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelFn()

	mi, err := ffprobe.ProbeURL(ctx, path)
	if err != nil {
		return nil, err
	}

	ret := MediaInfo{
		Path: path,
		// Remove leading .
		Extension: filepath.Ext(path)[1:],
		Size:      ParseUint64(mi.Format.Size),
		Duration:  float32(mi.Format.DurationSeconds),
		Container: OrNull(mi.Format.FormatName),
		Videos: MapStream(mi.Streams, ffprobe.StreamVideo, func(stream *ffprobe.Stream, i uint32) Video {
			lang, _ := language.Parse(stream.Tags.Language)
			return Video{
				Codec:     stream.CodecName,
				MimeCodec: GetMimeCodec(stream),
				Language:  NullIfUnd(lang.String()),
				Quality:   QualityFromHeight(uint32(stream.Height)),
				Width:     uint32(stream.Width),
				Height:    uint32(stream.Height),
				// ffmpeg does not report bitrate in mkv files, fallback to bitrate of the whole container
				// (bigger than the result since it contains audio and other videos but better than nothing).
				Bitrate: ParseUint(cmp.Or(stream.BitRate, mi.Format.BitRate)),
			}
		}),
		Audios: MapStream(mi.Streams, ffprobe.StreamAudio, func(stream *ffprobe.Stream, i uint32) Audio {
			lang, _ := language.Parse(stream.Tags.Language)
			return Audio{
				Index:     i,
				Title:     OrNull(stream.Tags.Title),
				Language:  NullIfUnd(lang.String()),
				Codec:     stream.CodecName,
				MimeCodec: GetMimeCodec(stream),
				IsDefault: stream.Disposition.Default != 0,
				IsForced:  stream.Disposition.Forced != 0,
			}
		}),
		Subtitles: MapStream(mi.Streams, ffprobe.StreamSubtitle, func(stream *ffprobe.Stream, i uint32) Subtitle {
			extension := OrNull(SubtitleExtensions[stream.CodecName])
			var link *string
			if extension != nil {
				x := fmt.Sprintf("%s/%s/subtitle/%d.%s", Settings.RoutePrefix, base64.StdEncoding.EncodeToString([]byte(path)), i, *extension)
				link = &x
			}
			lang, _ := language.Parse(stream.Tags.Language)
			return Subtitle{
				Index:     uint32(i),
				Title:     OrNull(stream.Tags.Title),
				Language:  NullIfUnd(lang.String()),
				Codec:     stream.CodecName,
				Extension: extension,
				IsDefault: stream.Disposition.Default != 0,
				IsForced:  stream.Disposition.Forced != 0,
				Link:      link,
			}
		}),
		Chapters: Map(mi.Chapters, func(c *ffprobe.Chapter, _ int) Chapter {
			return Chapter{
				Name:      c.Title(),
				StartTime: float32(c.StartTimeSeconds),
				EndTime:   float32(c.EndTimeSeconds),
			}
		}),
		Fonts: MapStream(mi.Streams, ffprobe.StreamAttachment, func(stream *ffprobe.Stream, i uint32) string {
			font, _ := stream.TagList.GetString("filename")
			return fmt.Sprintf("%s/%s/attachment/%s", Settings.RoutePrefix, base64.StdEncoding.EncodeToString([]byte(path)), font)
		}),
	}
	var codecs []string
	if len(ret.Videos) > 0 && ret.Videos[0].MimeCodec != nil {
		codecs = append(codecs, *ret.Videos[0].MimeCodec)
	}
	if len(ret.Audios) > 0 && ret.Audios[0].MimeCodec != nil {
		codecs = append(codecs, *ret.Audios[0].MimeCodec)
	}
	container := mime.TypeByExtension(fmt.Sprintf(".%s", ret.Extension))
	if container != "" {
		if len(codecs) > 0 {
			codecs_str := strings.Join(codecs, ", ")
			mime := fmt.Sprintf("%s; codecs=\"%s\"", container, codecs_str)
			ret.MimeCodec = &mime
		} else {
			ret.MimeCodec = &container
		}
	}

	if len(ret.Videos) > 0 {
		ret.Video = &ret.Videos[0]
	}
	return &ret, nil
}

```````

`\\?\D:\Kyoo\transcoder\src\keyframes.go`:

```````go
package src

import (
	"bufio"
	"fmt"
	"log"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

type Keyframe struct {
	Sha         string
	Keyframes   []float64
	CanTransmux bool
	IsDone      bool
	info        *KeyframeInfo
}
type KeyframeInfo struct {
	mutex     sync.RWMutex
	ready     sync.WaitGroup
	listeners []func(keyframes []float64)
}

func (kf *Keyframe) Get(idx int32) float64 {
	kf.info.mutex.RLock()
	defer kf.info.mutex.RUnlock()
	return kf.Keyframes[idx]
}

func (kf *Keyframe) Slice(start int32, end int32) []float64 {
	if end <= start {
		return []float64{}
	}
	kf.info.mutex.RLock()
	defer kf.info.mutex.RUnlock()
	ref := kf.Keyframes[start:end]
	ret := make([]float64, end-start)
	copy(ret, ref)
	return ret
}

func (kf *Keyframe) Length() (int32, bool) {
	kf.info.mutex.RLock()
	defer kf.info.mutex.RUnlock()
	return int32(len(kf.Keyframes)), kf.IsDone
}

func (kf *Keyframe) add(values []float64) {
	kf.info.mutex.Lock()
	defer kf.info.mutex.Unlock()
	kf.Keyframes = append(kf.Keyframes, values...)
	for _, listener := range kf.info.listeners {
		listener(kf.Keyframes)
	}
}

func (kf *Keyframe) AddListener(callback func(keyframes []float64)) {
	kf.info.mutex.Lock()
	defer kf.info.mutex.Unlock()
	kf.info.listeners = append(kf.info.listeners, callback)
}

var keyframes = NewCMap[string, *Keyframe]()

func GetKeyframes(sha string, path string) *Keyframe {
	ret, _ := keyframes.GetOrCreate(sha, func() *Keyframe {
		kf := &Keyframe{
			Sha:    sha,
			IsDone: false,
			info:   &KeyframeInfo{},
		}
		kf.info.ready.Add(1)
		go func() {
			save_path := fmt.Sprintf("%s/%s/keyframes.json", Settings.Metadata, sha)
			if err := getSavedInfo(save_path, kf); err == nil {
				log.Printf("Using keyframes cache on filesystem for %s", path)
				kf.info.ready.Done()
				return
			}

			err := getKeyframes(path, kf, sha)
			if err == nil {
				saveInfo(save_path, kf)
			}
		}()
		return kf
	})
	ret.info.ready.Wait()
	return ret
}

func getKeyframes(path string, kf *Keyframe, sha string) error {
	defer printExecTime("ffprobe analysis for %s", path)()
	// run ffprobe to return all IFrames, IFrames are points where we can split the video in segments.
	// We ask ffprobe to return the time of each frame and it's flags
	// We could ask it to return only i-frames (keyframes) with the -skip_frame nokey but using it is extremly slow
	// since ffmpeg parses every frames when this flag is set.
	cmd := exec.Command(
		"ffprobe",
		"-loglevel", "error",
		"-select_streams", "v:0",
		"-show_entries", "packet=pts_time,flags",
		"-of", "csv=print_section=0",
		path,
	)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	err = cmd.Start()
	if err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)

	ret := make([]float64, 0, 1000)
	max := 100
	done := 0
	// sometimes, videos can start at a timing greater than 0:00. We need to take that into account
	// and only list keyframes that come after the start of the video (without that, our segments count
	// mismatch and we can have the same segment twice on the stream).
	//
	// We can't hardcode the first keyframe at 0 because the transcoder needs to reference durations of segments
	// To handle this edge case, when we fetch the segment n0, no seeking is done but duration is computed from the
	// first keyframe (instead of 0)
	for scanner.Scan() {
		frame := scanner.Text()
		if frame == "" {
			continue
		}

		x := strings.Split(frame, ",")
		pts, flags := x[0], x[1]

		// true if there is no keyframes (e.g. in a file w/o video track)
		if pts == "N/A" {
			break
		}
		// Only take keyframes
		if flags[0] != 'K' {
			continue
		}

		fpts, err := strconv.ParseFloat(pts, 64)
		if err != nil {
			return err
		}

		// Before, we wanted to only save keyframes with at least 3s betweens
		// to prevent segments of 0.2s but sometimes, the -f segment muxer discards
		// the segment time and decide to cut at a random keyframe. Having every keyframe
		// handled as a segment prevents that.

		ret = append(ret, fpts)

		if len(ret) == max {
			kf.add(ret)
			if done == 0 {
				kf.info.ready.Done()
			} else if done >= 500 {
				max = 500
			}
			done += max
			// clear the array without reallocing it
			ret = ret[:0]
		}
	}
	// If there is less than 2 (i.e. equals 0 or 1 (it happens for audio files with poster))
	if len(ret) < 2 {
		dummy, err := getDummyKeyframes(path, sha)
		if err != nil {
			return err
		}
		ret = dummy
	}
	kf.add(ret)
	if done == 0 {
		kf.info.ready.Done()
	}
	kf.IsDone = true
	return nil
}

func getDummyKeyframes(path string, sha string) ([]float64, error) {
	dummyKeyframeDuration := float64(2)
	info, err := GetInfo(path, sha)
	if err != nil {
		return nil, err
	}
	segmentCount := int((float64(info.Duration) / dummyKeyframeDuration) + 1)
	ret := make([]float64, segmentCount)
	for segmentIndex := 0; segmentIndex < segmentCount; segmentIndex += 1 {
		ret[segmentIndex] = float64(segmentIndex) * dummyKeyframeDuration
	}
	return ret, nil
}

```````

`\\?\D:\Kyoo\transcoder\src\quality.go`:

```````go
package src

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type Quality string

const (
	P240     Quality = "240p"
	P360     Quality = "360p"
	P480     Quality = "480p"
	P720     Quality = "720p"
	P1080    Quality = "1080p"
	P1440    Quality = "1440p"
	P4k      Quality = "4k"
	P8k      Quality = "8k"
	Original Quality = "original"
)

// Purposfully removing Original from this list (since it require special treatments anyways)
var Qualities = []Quality{P240, P360, P480, P720, P1080, P1440, P4k, P8k}

func QualityFromString(str string) (Quality, error) {
	if str == string(Original) {
		return Original, nil
	}

	qualities := Qualities
	for _, quality := range qualities {
		if string(quality) == str {
			return quality, nil
		}
	}
	return Original, echo.NewHTTPError(http.StatusBadRequest, "Invalid quality")
}

// I'm not entierly sure about the values for bitrates. Double checking would be nice.
func (v Quality) AverageBitrate() uint32 {
	switch v {
	case P240:
		return 400_000
	case P360:
		return 800_000
	case P480:
		return 1_200_000
	case P720:
		return 2_400_000
	case P1080:
		return 4_800_000
	case P1440:
		return 9_600_000
	case P4k:
		return 16_000_000
	case P8k:
		return 28_000_000
	case Original:
		panic("Original quality must be handled specially")
	}
	panic("Invalid quality value")
}

func (v Quality) MaxBitrate() uint32 {
	switch v {
	case P240:
		return 700_000
	case P360:
		return 1_400_000
	case P480:
		return 2_100_000
	case P720:
		return 4_000_000
	case P1080:
		return 8_000_000
	case P1440:
		return 12_000_000
	case P4k:
		return 28_000_000
	case P8k:
		return 40_000_000
	case Original:
		panic("Original quality must be handled specially")
	}
	panic("Invalid quality value")
}

func (q Quality) Height() uint32 {
	switch q {
	case P240:
		return 240
	case P360:
		return 360
	case P480:
		return 480
	case P720:
		return 720
	case P1080:
		return 1080
	case P1440:
		return 1440
	case P4k:
		return 2160
	case P8k:
		return 4320
	case Original:
		panic("Original quality must be handled specially")
	}
	panic("Invalid quality value")
}

func QualityFromHeight(height uint32) Quality {
	qualities := Qualities
	for _, quality := range qualities {
		if quality.Height() >= height {
			return quality
		}
	}
	return P240
}

```````

`\\?\D:\Kyoo\transcoder\src\settings.go`:

```````go
package src

import "os"

func GetEnvOr(env string, def string) string {
	out := os.Getenv(env)
	if out == "" {
		return def
	}
	return out
}

type SettingsT struct {
	Outpath     string
	Metadata    string
	RoutePrefix string
	SafePath    string
	HwAccel     HwAccelT
}

type HwAccelT struct {
	Name        string
	DecodeFlags []string
	EncodeFlags []string
	ScaleFilter string
}

var Settings = SettingsT{
	Outpath:     GetEnvOr("GOCODER_CACHE_ROOT", "/cache"),
	Metadata:    GetEnvOr("GOCODER_METADATA_ROOT", "/metadata"),
	RoutePrefix: GetEnvOr("GOCODER_PREFIX", ""),
	SafePath:    GetEnvOr("GOCODER_SAFE_PATH", "/video"),
	HwAccel:     DetectHardwareAccel(),
}

```````

`\\?\D:\Kyoo\transcoder\src\stream.go`:

```````go
package src

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"
)

type Flags int32

const (
	AudioF   Flags = 1 << 0
	VideoF   Flags = 1 << 1
	Transmux Flags = 1 << 3
)

type StreamHandle interface {
	getTranscodeArgs(segments string) []string
	getOutPath(encoder_id int) string
	getFlags() Flags
}

type Stream struct {
	handle   StreamHandle
	file     *FileStream
	segments []Segment
	heads    []Head
	// the lock used for the the heads
	lock sync.RWMutex
}

type Segment struct {
	// channel open if the segment is not ready. closed if ready.
	// one can check if segment 1 is open by doing:
	//
	//  ts.isSegmentReady(1).
	//
	// You can also wait for it to be ready (non-blocking if already ready) by doing:
	//  <-ts.segments[i]
	channel chan (struct{})
	encoder int
}

type Head struct {
	segment int32
	end     int32
	command *exec.Cmd
}

var DeletedHead = Head{
	segment: -1,
	end:     -1,
	command: nil,
}

func NewStream(file *FileStream, handle StreamHandle, ret *Stream) {
	ret.handle = handle
	ret.file = file
	ret.heads = make([]Head, 0)

	length, is_done := file.Keyframes.Length()
	ret.segments = make([]Segment, length, max(length, 2000))
	for seg := range ret.segments {
		ret.segments[seg].channel = make(chan struct{})
	}

	if !is_done {
		file.Keyframes.AddListener(func(keyframes []float64) {
			ret.lock.Lock()
			defer ret.lock.Unlock()
			old_length := len(ret.segments)
			if cap(ret.segments) > len(keyframes) {
				ret.segments = ret.segments[:len(keyframes)]
			} else {
				ret.segments = append(ret.segments, make([]Segment, len(keyframes)-old_length)...)
			}
			for seg := old_length; seg < len(keyframes); seg++ {
				ret.segments[seg].channel = make(chan struct{})
			}
		})
	}
}

// Remember to lock before calling this.
func (ts *Stream) isSegmentReady(segment int32) bool {
	select {
	case <-ts.segments[segment].channel:
		// if the channel returned, it means it was closed
		return true
	default:
		return false
	}
}

func (ts *Stream) isSegmentTranscoding(segment int32) bool {
	for _, head := range ts.heads {
		if head.segment == segment {
			return true
		}
	}
	return false
}

func toSegmentStr(segments []float64) string {
	return strings.Join(Map(segments, func(seg float64, _ int) string {
		return fmt.Sprintf("%.6f", seg)
	}), ",")
}

func (ts *Stream) run(start int32) error {
	// Start the transcode up to the 100th segment (or less)
	length, is_done := ts.file.Keyframes.Length()
	end := min(start+100, length)
	// if keyframes analysys is not finished, always have a 1-segment padding
	// for the extra segment needed for precise split (look comment before -to flag)
	if !is_done {
		end -= 2
	}
	// Stop at the first finished segment
	ts.lock.Lock()
	for i := start; i < end; i++ {
		if ts.isSegmentReady(i) || ts.isSegmentTranscoding(i) {
			end = i
			break
		}
	}
	if start >= end {
		// this can happens if the start segment was finished between the check
		// to call run() and the actual call.
		// since most checks are done in a RLock() instead of a Lock() this can
		// happens when two goroutines try to make the same segment ready
		ts.lock.Unlock()
		return nil
	}
	encoder_id := len(ts.heads)
	ts.heads = append(ts.heads, Head{segment: start, end: end, command: nil})
	ts.lock.Unlock()

	log.Printf(
		"Starting transcode %d for %s (from %d to %d out of %d segments)",
		encoder_id,
		ts.file.Path,
		start,
		end,
		length,
	)

	// Include both the start and end delimiter because -ss and -to are not accurate
	// Having an extra segment allows us to cut precisely the segments we want with the
	// -f segment that does cut the begining and the end at the keyframe like asked
	start_ref := float64(0)
	start_segment := start
	if start != 0 {
		// we always take on segment before the current one, for different reasons for audio/video:
		//  - Audio: we need context before the starting point, without that ffmpeg doesnt know what to do and leave ~100ms of silence
		//  - Video: if a segment is really short (between 20 and 100ms), the padding given in the else block bellow is not enough and
		// the previous segment is played another time. the -segment_times is way more precise so it does not do the same with this one
		start_segment = start - 1
		if ts.handle.getFlags()&AudioF != 0 {
			start_ref = ts.file.Keyframes.Get(start_segment)
		} else {
			// the param for the -ss takes the keyframe before the specificed time
			// (if the specified time is a keyframe, it either takes that keyframe or the one before)
			// to prevent this weird behavior, we specify a bit after the keyframe that interest us

			// this can't be used with audio since we need to have context before the start-time
			// without this context, the cut loses a bit of audio (audio gap of ~100ms)
			if start_segment+1 == length {
				start_ref = (ts.file.Keyframes.Get(start_segment) + float64(ts.file.Info.Duration)) / 2
			} else {
				start_ref = (ts.file.Keyframes.Get(start_segment) + ts.file.Keyframes.Get(start_segment+1)) / 2
			}
		}
	}
	end_padding := int32(1)
	if end == length {
		end_padding = 0
	}
	segments := ts.file.Keyframes.Slice(start_segment+1, end+end_padding)
	if len(segments) == 0 {
		// we can't leave that empty else ffmpeg errors out.
		segments = []float64{9999999}
	}

	outpath := ts.handle.getOutPath(encoder_id)
	err := os.MkdirAll(filepath.Dir(outpath), 0o755)
	if err != nil {
		return err
	}

	args := []string{
		"-nostats", "-hide_banner", "-loglevel", "warning",
	}

	if ts.handle.getFlags()&VideoF != 0 {
		args = append(args, Settings.HwAccel.DecodeFlags...)
	}

	if start_ref != 0 {
		if ts.handle.getFlags()&VideoF != 0 {
			// This is the default behavior in transmux mode and needed to force pre/post segment to work
			// This must be disabled when processing only audio because it creates gaps in audio
			args = append(args, "-noaccurate_seek")
		}
		args = append(args,
			"-ss", fmt.Sprintf("%.6f", start_ref),
		)
	}
	// do not include -to if we want the file to go to the end
	if end+1 < length {
		// sometimes, the duration is shorter than expected (only during transcode it seems)
		// always include more and use the -f segment to split the file where we want
		end_ref := ts.file.Keyframes.Get(end + 1)
		// it seems that the -to is confused when -ss seek before the given time (because it searches for a keyframe)
		// add back the time that would be lost otherwise
		// this only appens when -to is before -i but having -to after -i gave a bug (not sure, don't remember)
		end_ref += start_ref - ts.file.Keyframes.Get(start_segment)
		args = append(args,
			"-to", fmt.Sprintf("%.6f", end_ref),
		)
	}
	args = append(args,
		"-i", ts.file.Path,
		// this makes behaviors consistent between soft and hardware decodes.
		// this also means that after a -ss 50, the output video will start at 50s
		"-start_at_zero",
		// for hls streams, -copyts is mandatory
		"-copyts",
		// this makes output file start at 0s instead of a random delay + the -ss value
		// this also cancel -start_at_zero weird delay.
		// this is not always respected but generally it gives better results.
		// even when this is not respected, it does not result in a bugged experience but this is something
		// to keep in mind when debugging
		"-muxdelay", "0",
	)
	args = append(args, ts.handle.getTranscodeArgs(toSegmentStr(segments))...)
	args = append(args,
		"-f", "segment",
		// needed for rounding issues when forcing keyframes
		// recommended value is 1/(2*frame_rate), which for a 24fps is ~0.021
		// we take a little bit more than that to be extra safe but too much can be harmfull
		// when segments are short (can make the video repeat itself)
		"-segment_time_delta", "0.05",
		"-segment_format", "mpegts",
		"-segment_times", toSegmentStr(Map(segments, func(seg float64, _ int) float64 {
			// segment_times want durations, not timestamps so we must substract the -ss param
			// since we give a greater value to -ss to prevent wrong seeks but -segment_times
			// needs precise segments, we use the keyframe we want to seek to as a reference.
			return seg - ts.file.Keyframes.Get(start_segment)
		})),
		"-segment_list_type", "flat",
		"-segment_list", "pipe:1",
		"-segment_start_number", fmt.Sprint(start_segment),
		outpath,
	)

	cmd := exec.Command("ffmpeg", args...)
	log.Printf("Running %s", strings.Join(cmd.Args, " "))

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	var stderr strings.Builder
	cmd.Stderr = &stderr

	err = cmd.Start()
	if err != nil {
		return err
	}
	ts.lock.Lock()
	ts.heads[encoder_id].command = cmd
	ts.lock.Unlock()

	go func() {
		scanner := bufio.NewScanner(stdout)
		format := filepath.Base(outpath)
		should_stop := false

		for scanner.Scan() {
			var segment int32
			_, _ = fmt.Sscanf(scanner.Text(), format, &segment)

			if segment < start {
				// This happen because we use -f segments for accurate cutting (since -ss is not)
				// check comment at begining of function for more info
				continue
			}
			ts.lock.Lock()
			ts.heads[encoder_id].segment = segment
			log.Printf("Segment %d got ready (%d)", segment, encoder_id)
			if ts.isSegmentReady(segment) {
				// the current segment is already marked at done so another process has already gone up to here.
				cmd.Process.Signal(os.Interrupt)
				log.Printf("Killing ffmpeg because segment %d is already ready", segment)
				should_stop = true
			} else {
				ts.segments[segment].encoder = encoder_id
				close(ts.segments[segment].channel)
				if segment == end-1 {
					// file finished, ffmped will finish soon on it's own
					should_stop = true
				} else if ts.isSegmentReady(segment + 1) {
					cmd.Process.Signal(os.Interrupt)
					log.Printf("Killing ffmpeg because next segment %d is ready", segment)
					should_stop = true
				}
			}
			ts.lock.Unlock()
			// we need this and not a return in the condition because we want to unlock
			// the lock (and can't defer since this is a loop)
			if should_stop {
				return
			}
		}

		if err := scanner.Err(); err != nil {
			log.Println("Error reading stdout of ffmpeg", err)
		}
	}()

	go func() {
		err := cmd.Wait()
		if exiterr, ok := err.(*exec.ExitError); ok && exiterr.ExitCode() == 255 {
			log.Printf("ffmpeg %d was killed by us", encoder_id)
		} else if err != nil {
			log.Printf("ffmpeg %d occured an error: %s: %s", encoder_id, err, stderr.String())
		} else {
			log.Printf("ffmpeg %d finished successfully", encoder_id)
		}

		ts.lock.Lock()
		defer ts.lock.Unlock()
		// we can't delete the head directly because it would invalidate the others encoder_id
		ts.heads[encoder_id] = DeletedHead
	}()

	return nil
}

func (ts *Stream) GetIndex() (string, error) {
	// playlist type is event since we can append to the list if Keyframe.IsDone is false.
	// start time offset makes the stream start at 0s instead of ~3segments from the end (requires version 6 of hls)
	index := `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-START:TIME-OFFSET=0
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-INDEPENDENT-SEGMENTS
`
	length, is_done := ts.file.Keyframes.Length()

	for segment := int32(0); segment < length-1; segment++ {
		index += fmt.Sprintf("#EXTINF:%.6f\n", ts.file.Keyframes.Get(segment+1)-ts.file.Keyframes.Get(segment))
		index += fmt.Sprintf("segment-%d.ts\n", segment)
	}
	// do not forget to add the last segment between the last keyframe and the end of the file
	// if the keyframes extraction is not done, do not bother to add it, it will be retrived on the next index retrival
	if is_done {
		index += fmt.Sprintf("#EXTINF:%.6f\n", float64(ts.file.Info.Duration)-ts.file.Keyframes.Get(length-1))
		index += fmt.Sprintf("segment-%d.ts\n", length-1)
		index += `#EXT-X-ENDLIST`
	}
	return index, nil
}

func (ts *Stream) GetSegment(segment int32) (string, error) {
	ts.lock.RLock()
	ready := ts.isSegmentReady(segment)
	// we want to calculate distance in the same lock else it can be funky
	distance := 0.
	is_scheduled := false
	if !ready {
		distance = ts.getMinEncoderDistance(segment)
		for _, head := range ts.heads {
			if head.segment <= segment && segment < head.end {
				is_scheduled = true
				break
			}
		}
	}
	readyChan := ts.segments[segment].channel
	ts.lock.RUnlock()

	if !ready {
		// Only start a new encode if there is too big a distance between the current encoder and the segment.
		if distance > 60 || !is_scheduled {
			log.Printf("Creating new head for %d since closest head is %fs aways", segment, distance)
			err := ts.run(segment)
			if err != nil {
				return "", err
			}
		} else {
			log.Printf("Waiting for segment %d since encoder head is %fs aways", segment, distance)
		}

		select {
		case <-readyChan:
		case <-time.After(60 * time.Second):
			return "", errors.New("could not retrive the selected segment (timeout)")
		}
	}
	ts.prerareNextSegements(segment)
	return fmt.Sprintf(ts.handle.getOutPath(ts.segments[segment].encoder), segment), nil
}

func (ts *Stream) prerareNextSegements(segment int32) {
	// Audio is way cheaper to create than video so we don't need to run them in advance
	// Running it in advance might actually slow down the video encode since less compute
	// power can be used so we simply disable that.
	if ts.handle.getFlags()&VideoF == 0 {
		return
	}
	ts.lock.RLock()
	defer ts.lock.RUnlock()
	for i := segment + 1; i <= min(segment+10, int32(len(ts.segments)-1)); i++ {
		if ts.isSegmentReady(i) {
			continue
		}
		// only start encode for segments not planned (getMinEncoderDistance returns Inf for them)
		// or if they are 60s away (asume 5s per segments)
		if ts.getMinEncoderDistance(i) < 60+(5*float64(i-segment)) {
			continue
		}
		log.Printf("Creating new head for future segment (%d)", i)
		go ts.run(i)
		return
	}
}

func (ts *Stream) getMinEncoderDistance(segment int32) float64 {
	time := ts.file.Keyframes.Get(segment)
	distances := Map(ts.heads, func(head Head, _ int) float64 {
		// ignore killed heads or heads after the current time
		if head.segment < 0 || ts.file.Keyframes.Get(head.segment) > time || segment >= head.end {
			return math.Inf(1)
		}
		return time - ts.file.Keyframes.Get(head.segment)
	})
	if len(distances) == 0 {
		return math.Inf(1)
	}
	return slices.Min(distances)
}

func (ts *Stream) Kill() {
	ts.lock.Lock()
	defer ts.lock.Unlock()

	for id := range ts.heads {
		ts.KillHead(id)
	}
}

// Stream assume to be locked
func (ts *Stream) KillHead(encoder_id int) {
	if ts.heads[encoder_id] == DeletedHead || ts.heads[encoder_id].command == nil {
		return
	}
	ts.heads[encoder_id].command.Process.Signal(os.Interrupt)
	ts.heads[encoder_id] = DeletedHead
}

```````

`\\?\D:\Kyoo\transcoder\src\thumbnails.go`:

```````go
package src

import (
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"log"
	"math"
	"os"
	"sync"

	"github.com/disintegration/imaging"
	"gitlab.com/opennota/screengen"
)

// We want to have a thumbnail every ${interval} seconds.
var default_interval = 10

// The maximim number of thumbnails per video.
// Setting this too high allows really long processing times.
var max_numcaps = 150

type Thumbnail struct {
	ready sync.WaitGroup
	path  string
}

var thumbnails = NewCMap[string, *Thumbnail]()

func ExtractThumbnail(path string, sha string) (string, error) {
	ret, _ := thumbnails.GetOrCreate(sha, func() *Thumbnail {
		ret := &Thumbnail{
			path: fmt.Sprintf("%s/%s", Settings.Metadata, sha),
		}
		ret.ready.Add(1)
		go func() {
			extractThumbnail(path, ret.path)
			ret.ready.Done()
		}()
		return ret
	})
	ret.ready.Wait()
	return ret.path, nil
}

func extractThumbnail(path string, out string) error {
	defer printExecTime("extracting thumbnails for %s", path)()
	os.MkdirAll(out, 0o755)
	sprite_path := fmt.Sprintf("%s/sprite.png", out)
	vtt_path := fmt.Sprintf("%s/sprite.vtt", out)

	if _, err := os.Stat(sprite_path); err == nil {
		return nil
	}

	gen, err := screengen.NewGenerator(path)
	if err != nil {
		log.Printf("Error reading video file: %v", err)
		return err
	}
	defer gen.Close()

	gen.Fast = true

	duration := int(gen.Duration) / 1000
	var numcaps int
	if default_interval < duration {
		numcaps = duration / default_interval
	} else {
		numcaps = duration / 10
	}
	numcaps = min(numcaps, max_numcaps)
	interval := duration / numcaps
	columns := int(math.Sqrt(float64(numcaps)))
	rows := int(math.Ceil(float64(numcaps) / float64(columns)))

	height := 144
	width := int(float64(height) / float64(gen.Height()) * float64(gen.Width()))

	sprite := imaging.New(width*columns, height*rows, color.Black)
	vtt := "WEBVTT\n\n"

	log.Printf("Extracting %d thumbnails for %s (interval of %d).", numcaps, path, interval)

	ts := 0
	for i := 0; i < numcaps; i++ {
		img, err := gen.ImageWxH(int64(ts*1000), width, height)
		if err != nil {
			log.Printf("Could not generate screenshot %s", err)
			return err
		}

		x := (i % columns) * width
		y := (i / columns) * height
		sprite = imaging.Paste(sprite, img, image.Pt(x, y))

		timestamps := ts
		ts += interval
		vtt += fmt.Sprintf(
			"%s --> %s\n%s/%s/thumbnails.png#xywh=%d,%d,%d,%d\n\n",
			tsToVttTime(timestamps),
			tsToVttTime(ts),
			Settings.RoutePrefix,
			base64.StdEncoding.EncodeToString([]byte(path)),
			x,
			y,
			width,
			height,
		)
	}

	err = os.WriteFile(vtt_path, []byte(vtt), 0o644)
	if err != nil {
		return err
	}
	err = imaging.Save(sprite, sprite_path)
	if err != nil {
		return err
	}
	return nil
}

func tsToVttTime(ts int) string {
	return fmt.Sprintf("%02d:%02d:%02d.000", ts/3600, (ts/60)%60, ts%60)
}

```````

`\\?\D:\Kyoo\transcoder\src\tracker.go`:

```````go
package src

import (
	"log"
	"time"
)

type ClientInfo struct {
	client  string
	path    string
	quality *Quality
	audio   int32
	head    int32
}

type Tracker struct {
	// key: client_id
	clients map[string]ClientInfo
	// key: client_id
	visitDate map[string]time.Time
	// key: path
	lastUsage     map[string]time.Time
	transcoder    *Transcoder
	deletedStream chan string
}

func NewTracker(t *Transcoder) *Tracker {
	ret := &Tracker{
		clients:       make(map[string]ClientInfo),
		visitDate:     make(map[string]time.Time),
		lastUsage:     make(map[string]time.Time),
		deletedStream: make(chan string),
		transcoder:    t,
	}
	go ret.start()
	return ret
}

func Abs(x int32) int32 {
	if x < 0 {
		return -x
	}
	return x
}

func (t *Tracker) start() {
	inactive_time := 1 * time.Hour
	timer := time.After(inactive_time)
	for {
		select {
		case info, ok := <-t.transcoder.clientChan:
			if !ok {
				return
			}

			old, ok := t.clients[info.client]
			// First fixup the info. Most routes ruturn partial infos
			if ok && old.path == info.path {
				if info.quality == nil {
					info.quality = old.quality
				}
				if info.audio == -1 {
					info.audio = old.audio
				}
				if info.head == -1 {
					info.head = old.head
				}
			}

			t.clients[info.client] = info
			t.visitDate[info.client] = time.Now()
			t.lastUsage[info.path] = time.Now()

			// now that the new info is stored and fixed, kill old streams
			if ok && old.path == info.path {
				if old.audio != info.audio && old.audio != -1 {
					t.KillAudioIfDead(old.path, old.audio)
				}
				if old.quality != info.quality && old.quality != nil {
					t.KillQualityIfDead(old.path, *old.quality)
				}
				if old.head != -1 && Abs(info.head-old.head) > 100 {
					t.KillOrphanedHeads(old.path, old.quality, old.audio)
				}
			} else if ok {
				t.KillStreamIfDead(old.path)
			}

		case <-timer:
			timer = time.After(inactive_time)
			// Purge old clients
			for client, date := range t.visitDate {
				if time.Since(date) < inactive_time {
					continue
				}

				info := t.clients[client]
				delete(t.clients, client)
				delete(t.visitDate, client)

				if !t.KillStreamIfDead(info.path) {
					audio_cleanup := info.audio != -1 && t.KillAudioIfDead(info.path, info.audio)
					video_cleanup := info.quality != nil && t.KillQualityIfDead(info.path, *info.quality)
					if !audio_cleanup || !video_cleanup {
						t.KillOrphanedHeads(info.path, info.quality, info.audio)
					}
				}
			}
		case path := <-t.deletedStream:
			t.DestroyStreamIfOld(path)
		}
	}
}

func (t *Tracker) KillStreamIfDead(path string) bool {
	for _, stream := range t.clients {
		if stream.path == path {
			return false
		}
	}
	log.Printf("Nobody is watching %s. Killing it", path)

	stream, ok := t.transcoder.streams.Get(path)
	if !ok {
		return false
	}
	stream.Kill()
	go func() {
		time.Sleep(4 * time.Hour)
		t.deletedStream <- path
	}()
	return true
}

func (t *Tracker) DestroyStreamIfOld(path string) {
	if time.Since(t.lastUsage[path]) < 4*time.Hour {
		return
	}
	stream, ok := t.transcoder.streams.GetAndRemove(path)
	if !ok {
		return
	}
	stream.Destroy()
}

func (t *Tracker) KillAudioIfDead(path string, audio int32) bool {
	for _, stream := range t.clients {
		if stream.path == path && stream.audio == audio {
			return false
		}
	}
	log.Printf("Nobody is listening audio %d of %s. Killing it", audio, path)

	stream, ok := t.transcoder.streams.Get(path)
	if !ok {
		return false
	}
	astream, aok := stream.audios.Get(audio)
	if !aok {
		return false
	}
	astream.Kill()
	return true
}

func (t *Tracker) KillQualityIfDead(path string, quality Quality) bool {
	for _, stream := range t.clients {
		if stream.path == path && stream.quality != nil && *stream.quality == quality {
			return false
		}
	}
	log.Printf("Nobody is watching quality %s of %s. Killing it", quality, path)

	stream, ok := t.transcoder.streams.Get(path)
	if !ok {
		return false
	}
	vstream, vok := stream.videos.Get(quality)
	if !vok {
		return false
	}
	vstream.Kill()
	return true
}

func (t *Tracker) KillOrphanedHeads(path string, quality *Quality, audio int32) {
	stream, ok := t.transcoder.streams.Get(path)
	if !ok {
		return
	}

	if quality != nil {
		vstream, vok := stream.videos.Get(*quality)
		if vok {
			t.killOrphanedeheads(&vstream.Stream)
		}
	}
	if audio != -1 {
		astream, aok := stream.audios.Get(audio)
		if aok {
			t.killOrphanedeheads(&astream.Stream)
		}
	}
}

func (t *Tracker) killOrphanedeheads(stream *Stream) {
	stream.lock.Lock()
	defer stream.lock.Unlock()

	for encoder_id, head := range stream.heads {
		if head == DeletedHead {
			continue
		}

		distance := int32(99999)
		for _, info := range t.clients {
			if info.head == -1 {
				continue
			}
			distance = min(Abs(info.head-head.segment), distance)
		}
		if distance > 20 {
			log.Printf("Killing orphaned head %s %d", stream.file.Path, encoder_id)
			stream.KillHead(encoder_id)
		}
	}
}

```````

`\\?\D:\Kyoo\transcoder\src\transcoder.go`:

```````go
package src

import (
	"os"
	"path"
)

type Transcoder struct {
	// All file streams currently running, index is file path
	streams    CMap[string, *FileStream]
	clientChan chan ClientInfo
	tracker    *Tracker
}

func NewTranscoder() (*Transcoder, error) {
	out := Settings.Outpath
	dir, err := os.ReadDir(out)
	if err != nil {
		return nil, err
	}
	for _, d := range dir {
		err = os.RemoveAll(path.Join(out, d.Name()))
		if err != nil {
			return nil, err
		}
	}

	ret := &Transcoder{
		streams:    NewCMap[string, *FileStream](),
		clientChan: make(chan ClientInfo, 10),
	}
	ret.tracker = NewTracker(ret)
	return ret, nil
}

func (t *Transcoder) getFileStream(path string, sha string) (*FileStream, error) {
	var err error
	ret, _ := t.streams.GetOrCreate(path, func() *FileStream {
		return NewFileStream(path, sha)
	})
	ret.ready.Wait()
	if err != nil || ret.err != nil {
		t.streams.Remove(path)
		return nil, ret.err
	}
	return ret, nil
}

func (t *Transcoder) GetMaster(path string, client string, sha string) (string, error) {
	stream, err := t.getFileStream(path, sha)
	if err != nil {
		return "", err
	}
	t.clientChan <- ClientInfo{
		client:  client,
		path:    path,
		quality: nil,
		audio:   -1,
		head:    -1,
	}
	return stream.GetMaster(), nil
}

func (t *Transcoder) GetVideoIndex(
	path string,
	quality Quality,
	client string,
	sha string,
) (string, error) {
	stream, err := t.getFileStream(path, sha)
	if err != nil {
		return "", err
	}
	t.clientChan <- ClientInfo{
		client:  client,
		path:    path,
		quality: &quality,
		audio:   -1,
		head:    -1,
	}
	return stream.GetVideoIndex(quality)
}

func (t *Transcoder) GetAudioIndex(
	path string,
	audio int32,
	client string,
	sha string,
) (string, error) {
	stream, err := t.getFileStream(path, sha)
	if err != nil {
		return "", err
	}
	t.clientChan <- ClientInfo{
		client: client,
		path:   path,
		audio:  audio,
		head:   -1,
	}
	return stream.GetAudioIndex(audio)
}

func (t *Transcoder) GetVideoSegment(
	path string,
	quality Quality,
	segment int32,
	client string,
	sha string,
) (string, error) {
	stream, err := t.getFileStream(path, sha)
	if err != nil {
		return "", err
	}
	t.clientChan <- ClientInfo{
		client:  client,
		path:    path,
		quality: &quality,
		audio:   -1,
		head:    segment,
	}
	return stream.GetVideoSegment(quality, segment)
}

func (t *Transcoder) GetAudioSegment(
	path string,
	audio int32,
	segment int32,
	client string,
	sha string,
) (string, error) {
	stream, err := t.getFileStream(path, sha)
	if err != nil {
		return "", err
	}
	t.clientChan <- ClientInfo{
		client: client,
		path:   path,
		audio:  audio,
		head:   segment,
	}
	return stream.GetAudioSegment(audio, segment)
}

```````

`\\?\D:\Kyoo\transcoder\src\utils.go`:

```````go
package src

import (
	"fmt"
	"log"
	"time"
)

func printExecTime(message string, args ...any) func() {
	msg := fmt.Sprintf(message, args...)
	start := time.Now()
	log.Printf("Running %s", msg)

	return func() {
		log.Printf("%s finished in %s", msg, time.Since(start))
	}
}

```````

`\\?\D:\Kyoo\transcoder\src\videostream.go`:

```````go
package src

import (
	"fmt"
	"log"
)

type VideoStream struct {
	Stream
	quality Quality
}

func NewVideoStream(file *FileStream, quality Quality) *VideoStream {
	log.Printf("Creating a new video stream for %s in quality %s", file.Path, quality)
	ret := new(VideoStream)
	ret.quality = quality
	NewStream(file, ret, &ret.Stream)
	return ret
}

func (vs *VideoStream) getFlags() Flags {
	if vs.quality == Original {
		return VideoF | Transmux
	}
	return VideoF
}

func (vs *VideoStream) getOutPath(encoder_id int) string {
	return fmt.Sprintf("%s/segment-%s-%d-%%d.ts", vs.file.Out, vs.quality, encoder_id)
}

func closestMultiple(n int32, x int32) int32 {
	if x > n {
		return x
	}

	n = n + x/2
	n = n - (n % x)
	return n
}

func (vs *VideoStream) getTranscodeArgs(segments string) []string {
	args := []string{
		"-map", "0:V:0",
	}

	if vs.quality == Original {
		args = append(args,
			"-c:v", "copy",
		)
		return args
	}

	args = append(args, Settings.HwAccel.EncodeFlags...)
	width := int32(float64(vs.quality.Height()) / float64(vs.file.Info.Video.Height) * float64(vs.file.Info.Video.Width))
	// force a width that is a multiple of two else some apps behave badly.
	width = closestMultiple(width, 2)
	args = append(args,
		"-vf", fmt.Sprintf(Settings.HwAccel.ScaleFilter, width, vs.quality.Height()),
		// Even less sure but bufsize are 5x the avergae bitrate since the average bitrate is only
		// useful for hls segments.
		"-bufsize", fmt.Sprint(vs.quality.MaxBitrate()*5),
		"-b:v", fmt.Sprint(vs.quality.AverageBitrate()),
		"-maxrate", fmt.Sprint(vs.quality.MaxBitrate()),
		// Force segments to be split exactly on keyframes (only works when transcoding)
		// forced-idr is needed to force keyframes to be an idr-frame (by default it can be any i frames)
		// without this option, some hardware encoders uses others i-frames and the -f segment can't cut at them.
		"-forced-idr", "1",
		"-force_key_frames", segments,
		// make ffmpeg globaly less buggy
		"-strict", "-2",
	)
	return args
}

```````

`\\?\D:\Kyoo\transcoder\utils.go`:

```````go
package main

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/zoriya/kyoo/transcoder/src"
)

// Encode the version in the hash path to update cached values.
// Older versions won't be deleted (needed to allow multiples versions of the transcoder to run at the same time)
// If the version changes a lot, we might want to automatically delete older versions.
var version = "v3-"

func GetPath(c echo.Context) (string, string, error) {
	key := c.Param("path")
	if key == "" {
		return "", "", echo.NewHTTPError(http.StatusBadRequest, "Missing resouce path.")
	}
	pathb, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return "", "", echo.NewHTTPError(http.StatusBadRequest, "Invalid path. Should be base64 encoded.")
	}
	path := filepath.Clean(string(pathb))
	if !filepath.IsAbs(path) {
		return "", "", echo.NewHTTPError(http.StatusBadRequest, "Absolute path required.")
	}
	if !strings.HasPrefix(path, src.Settings.SafePath) {
		return "", "", echo.NewHTTPError(http.StatusBadRequest, "Selected path is not marked as safe.")
	}
	hash, err := getHash(path)
	if err != nil {
		return "", "", echo.NewHTTPError(http.StatusNotFound, "File does not exist")
	}

	return path, hash, nil
}

func getHash(path string) (string, error) {
	info, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	h := sha1.New()
	h.Write([]byte(path))
	h.Write([]byte(info.ModTime().String()))
	sha := hex.EncodeToString(h.Sum(nil))
	return version + sha, nil
}

func SanitizePath(path string) error {
	if strings.Contains(path, "/") || strings.Contains(path, "..") {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid parameter. Can't contains path delimiters or ..")
	}
	return nil
}

func GetClientId(c echo.Context) (string, error) {
	key := c.Request().Header.Get("X-CLIENT-ID")
	if key == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, "missing client id. Please specify the X-CLIENT-ID header to a guid constant for the lifetime of the player (but unique per instance)")
	}
	return key, nil
}

func ParseSegment(segment string) (int32, error) {
	var ret int32
	_, err := fmt.Sscanf(segment, "segment-%d.ts", &ret)
	if err != nil {
		return 0, echo.NewHTTPError(http.StatusBadRequest, "Could not parse segment.")
	}
	return ret, nil
}

func ErrorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	var message string
	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
		message = fmt.Sprint(he.Message)
	} else {
		c.Logger().Error(err)
		message = "Internal server error"
	}
	c.JSON(code, struct {
		Errors []string `json:"errors"`
	}{Errors: []string{message}})
}

```````